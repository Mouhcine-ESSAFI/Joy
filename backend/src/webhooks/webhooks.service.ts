import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebhookLog } from './entities/webhook-log.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersService } from '../orders/orders.service';
import { ShopifyStoresService } from '../shopify-stores/shopify-stores.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CustomersService } from '../shopify-customers/customers.service';
import { EventsGateway } from '../events/events.gateway';
import { ShopifyParserService } from '../shopify-parser/shopify-parser.service';
import { TourMappingsService } from '../tour-mappings/tour-mappings.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private webhookLogsRepository: Repository<WebhookLog>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private ordersService: OrdersService,
    private shopifyStoresService: ShopifyStoresService,
    private notificationsService: NotificationsService,
    private customersService: CustomersService,
    private eventsGateway: EventsGateway,
    private shopifyParserService: ShopifyParserService,
    private tourMappingsService: TourMappingsService,
  ) {}

  async handleOrderCreate(payload: any, shopDomain: string): Promise<void> {
    const webhookLog = await this.createWebhookLog('orders/create', payload, shopDomain);

    try {
      const shopifyOrderId = payload.id.toString();

      let firstOrderId: string | null = null;
      let firstOrderNumber: string | null = null;

      // ✅ FIX 1: Check for duplicates BEFORE creating
      const existingOrders = await this.ordersRepository.find({
        where: { shopifyOrderId }
      });

      if (existingOrders.length > 0) {
        this.logger.warn(`⚠️ Order ${shopifyOrderId} already exists, skipping creation`);
        webhookLog.status = 'skipped';
        webhookLog.errorMessage = 'Order already exists';
        await this.webhookLogsRepository.save(webhookLog);
        return;
      }

      // Find store by domain
      const stores = await this.shopifyStoresService.findAll();
      const store = stores.find(s => s.shopifyDomain === shopDomain);

      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Parse and create order
      const parsedOrder = this.parseShopifyOrderJSON(payload, store.internalName);

      const storeLocale = await this.shopifyStoresService.fetchAndCachePrimaryLocale(store);
      const metafieldCache = new Map<string, any[]>();

      for (const lineItem of parsedOrder.lineItems) {
        let productMetafields: any[] = [];
        if (lineItem.productId) {
          if (!metafieldCache.has(lineItem.productId)) {
            metafieldCache.set(lineItem.productId, await this.fetchProductMetafields(store, lineItem.productId));
          }
          productMetafields = metafieldCache.get(lineItem.productId)!;
        }

        const itineraryStops = await this.fetchItineraryStops(store, productMetafields);

        const orderDto = {
          shopifyOrderId: parsedOrder.shopifyOrderId,
          shopifyOrderNumber: parsedOrder.shopifyOrderNumber,
          shopifyLineItemId: lineItem.shopifyLineItemId,
          shopifyCustomerId: payload.customer?.id?.toString() || null, // ⭐ ADD THIS
          lineItemIndex: lineItem.lineItemIndex,
          storeId: parsedOrder.storeId,
          shopifyCreatedAt: new Date(payload.created_at),

          customerName: parsedOrder.customerName,
          customerEmail: parsedOrder.customerEmail,
          customerPhone: parsedOrder.customerPhone,
          billingPhone: parsedOrder.billingPhone,

          shopifyProductId: lineItem.productId ?? null,

          tourDate: lineItem.tourDate ? lineItem.tourDate.toISOString().split('T')[0] : null,
          tourHour: lineItem.tourHour,
          pax: lineItem.pax || 1,
          tourTitle: lineItem.tourTitle,
          tourType: lineItem.tourType,
          campType: lineItem.campType,
          pickupLocation: lineItem.pickupLocation,

          lineItemPrice: lineItem.lineItemPrice,
          lineItemDiscount: lineItem.lineItemDiscount,
          shopifyTotalAmount: parsedOrder.shopifyTotalAmount,
          originalTotalAmount: parsedOrder.originalTotalAmount,
          depositAmount: parsedOrder.depositAmount,
          balanceAmount: parsedOrder.balanceAmount,
          currency: parsedOrder.currency,

          financialStatus: parsedOrder.financialStatus as any,

          tags: parsedOrder.tags,
          note: parsedOrder.note,
          language: storeLocale ?? store.internalName,

          stops: itineraryStops.length ? JSON.stringify(itineraryStops) : null,
          lineItemProperties: { raw: lineItem.properties },
          shopifyMetadata: { productType: lineItem.productType, metafields: productMetafields },
        };

        const createdOrder = await this.ordersService.create(orderDto as any);
        webhookLog.processedOrderId = createdOrder.id;
        this.logger.log(`✅ Created order ${createdOrder.id} from line item ${lineItem.shopifyLineItemId}`);

              // ⭐ ADD: Track first order for notification
        if (!firstOrderId) {
          firstOrderId = createdOrder.id;
          firstOrderNumber = createdOrder.shopifyOrderNumber;
        }
      }

      // Upsert customer from Shopify payload
      if (payload.customer?.id && store) {
        try {
          const billingCountryCode = payload.billing_address?.country_code || payload.shipping_address?.country_code;
          await this.customersService.upsertFromShopify(
            payload.customer,
            store.shopifyDomain,
            store.internalName,
            billingCountryCode,
          );
        } catch (e: any) {
          this.logger.warn(`Failed to upsert customer: ${e.message}`);
        }
      }

      // Push notification + WebSocket broadcast for new order
      if (firstOrderId && firstOrderNumber) {
        try {
          await this.notificationsService.notifyNewOrder(firstOrderId, firstOrderNumber);
        } catch (notifError) {
          this.logger.error(`Failed to send push notification: ${notifError.message}`);
        }
        this.eventsGateway.emitNewOrder(firstOrderId, firstOrderNumber, store.internalName);
      }

      this.notifyOrdersUpdated(store.internalName);

      webhookLog.status = 'processed';
      webhookLog.processedAt = new Date();
      await this.webhookLogsRepository.save(webhookLog);

    } catch (error) {
      webhookLog.status = 'failed';
      webhookLog.errorMessage = error.message;
      await this.webhookLogsRepository.save(webhookLog);
      throw error;
    }
  }

  async handleOrderUpdate(payload: any, shopDomain: string): Promise<void> {
    const webhookLog = await this.createWebhookLog('orders/updated', payload, shopDomain);

    try {
      const shopifyOrderId = payload.id.toString();
      
      // ✅ FIX 2: Find existing orders first
      const existingOrders = await this.ordersRepository.find({
        where: { shopifyOrderId }
      });

      // If order doesn't exist, create it (missed create webhook)
      if (existingOrders.length === 0) {
        this.logger.warn(`⚠️ Order ${shopifyOrderId} not found, creating it`);
        return this.handleOrderCreate(payload, shopDomain);
      }

      // Find store by domain
      const stores = await this.shopifyStoresService.findAll();
      const store = stores.find(s => s.shopifyDomain === shopDomain);

      if (!store) {
        throw new Error(`Store not found: ${shopDomain}`);
      }

      // Parse updated order
      const parsedOrder = this.parseShopifyOrderJSON(payload, store.internalName);

      const storeLocale = await this.shopifyStoresService.fetchAndCachePrimaryLocale(store);
      const metafieldCache = new Map<string, any[]>();

      // Update each existing order
      for (const existingOrder of existingOrders) {
        // Find corresponding line item
        const lineItem = parsedOrder.lineItems.find(
          (item: any) => item.shopifyLineItemId === existingOrder.shopifyLineItemId
        );

        if (!lineItem) {
          this.logger.warn(`⚠️ Line item ${existingOrder.shopifyLineItemId} not found in update`);
          continue;
        }

        let productMetafields: any[] = [];
        if (lineItem.productId) {
          if (!metafieldCache.has(lineItem.productId)) {
            metafieldCache.set(lineItem.productId, await this.fetchProductMetafields(store, lineItem.productId));
          }
          productMetafields = metafieldCache.get(lineItem.productId)!;
        }

        const itineraryStops = await this.fetchItineraryStops(store, productMetafields);

        const updates: any = {
          shopifyCreatedAt: new Date(payload.created_at),
          shopifyCustomerId: payload.customer?.id?.toString() || null,
          customerName: parsedOrder.customerName,
          customerEmail: parsedOrder.customerEmail,
          // customerPhone is intentionally excluded — users edit it manually in the booking app
          // and Shopify often sends null or stale values that would overwrite their edits
          shopifyProductId: lineItem.productId ?? null,
          tourDate: lineItem.tourDate ? lineItem.tourDate.toISOString().split('T')[0] : null,
          tourHour: lineItem.tourHour,
          pax: lineItem.pax || 1,
          tourTitle: lineItem.tourTitle,
          tourType: lineItem.tourType,
          campType: lineItem.campType,
          pickupLocation: lineItem.pickupLocation,
          lineItemPrice: lineItem.lineItemPrice,
          lineItemDiscount: lineItem.lineItemDiscount,
          shopifyTotalAmount: parsedOrder.shopifyTotalAmount,
          originalTotalAmount: parsedOrder.originalTotalAmount,
          depositAmount: parsedOrder.depositAmount,
          balanceAmount: parsedOrder.balanceAmount,
          currency: parsedOrder.currency,
          financialStatus: parsedOrder.financialStatus as any,
          tags: parsedOrder.tags,
          note: parsedOrder.note,
          stops: itineraryStops.length ? JSON.stringify(itineraryStops) : null,
          lineItemProperties: { raw: lineItem.properties },
          shopifyMetadata: { productType: lineItem.productType, metafields: productMetafields },
        };

        // ⭐ CRITICAL: Only auto-update status if currently "New"
        if (existingOrder.status === 'New') {
          updates.status = 'Updated';
          this.logger.log(`📝 Changing status from "New" to "Updated" for order ${existingOrder.id}`);
        } else {
          this.logger.log(`🔒 Keeping status "${existingOrder.status}" for order ${existingOrder.id}`);
        }

        await this.ordersRepository.update(existingOrder.id, updates);
        this.logger.log(`✅ Updated order ${existingOrder.id}`);
      }
      // Upsert customer from updated payload
      if (payload.customer?.id && store) {
        try {
          const billingCountryCode = payload.billing_address?.country_code || payload.shipping_address?.country_code;
          await this.customersService.upsertFromShopify(
            payload.customer,
            store.shopifyDomain,
            store.internalName,
            billingCountryCode,
          );
        } catch (e: any) {
          this.logger.warn(`Failed to upsert customer on update: ${e.message}`);
        }
      }

      await this.notifyOrdersUpdated(store.internalName);
      webhookLog.status = 'processed';
      webhookLog.processedAt = new Date();
      await this.webhookLogsRepository.save(webhookLog);

    } catch (error) {
      webhookLog.status = 'failed';
      webhookLog.errorMessage = error.message;
      await this.webhookLogsRepository.save(webhookLog);
      throw error;
    }
  }

  async handleOrderCancel(payload: any, shopDomain: string): Promise<void> {
    const webhookLog = await this.createWebhookLog('orders/cancelled', payload, shopDomain);

    try {
      const shopifyOrderId = payload.id.toString();
      
      // ✅ FIX 3: Actually cancel orders
      const result = await this.ordersRepository.update(
        { shopifyOrderId },
        { 
          status: 'Canceled' as any,
          canceledAt: new Date()
        }
      );

      this.logger.log(`✅ Cancelled ${result.affected} order(s) for Shopify order ${shopifyOrderId}`);

      const stores = await this.shopifyStoresService.findAll();
      const store = stores.find(s => s.shopifyDomain === shopDomain);
      if (store) {
        await this.notifyOrdersUpdated(store.internalName);
      }

      webhookLog.status = 'processed';
      webhookLog.processedAt = new Date();
      await this.webhookLogsRepository.save(webhookLog);

    } catch (error) {
      webhookLog.status = 'failed';
      webhookLog.errorMessage = error.message;
      await this.webhookLogsRepository.save(webhookLog);
      throw error;
    }
  }

  private async createWebhookLog(topic: string, payload: any, shopDomain: string): Promise<WebhookLog> {
    const log = this.webhookLogsRepository.create({
      topic,
      shopifyOrderId: payload.id?.toString(),
      shopifyOrderNumber: payload.name?.toString(),
      storeId: shopDomain,
      payload,
      status: 'pending',
    });

    return await this.webhookLogsRepository.save(log);
  }

  // ==========================================
  // PARSING FUNCTIONS (from fetch-shopify-orders.ts)
  // ==========================================

  private parseShopifyOrderJSON(shopifyOrder: any, storeId: string): any {
    let customerName = '';
    if (shopifyOrder.customer) {
      customerName = `${shopifyOrder.customer.first_name || ''} ${shopifyOrder.customer.last_name || ''}`.trim();
    }
    if (!customerName && shopifyOrder.billing_address) {
      customerName = `${shopifyOrder.billing_address.first_name || ''} ${shopifyOrder.billing_address.last_name || ''}`.trim();
    }
    if (!customerName) {
      customerName = 'Guest Customer';
    }

    const customerEmail = shopifyOrder.customer?.email || 
                         shopifyOrder.email || 
                         shopifyOrder.contact_email || 
                         null;

    const countryCode = shopifyOrder.billing_address?.country_code || shopifyOrder.shipping_address?.country_code;
    // customer.phone is E.164 from Shopify — prefer it; fall back to address phone + normalize
    const customerPhone =
      this.shopifyParserService.normalizePhone(shopifyOrder.customer?.phone, countryCode) ??
      this.shopifyParserService.normalizePhone(
        shopifyOrder.billing_address?.phone || shopifyOrder.phone || shopifyOrder.shipping_address?.phone || null,
        countryCode,
      );

    const subtotal = parseFloat(shopifyOrder.subtotal_price || '0');
    const totalDiscount = parseFloat(shopifyOrder.total_discounts || '0');
    const shopifyTotal = parseFloat(shopifyOrder.total_price || '0');

    const originalTotal = subtotal;
    const deposit = shopifyTotal;
    const balance = originalTotal - deposit;

    const tags = shopifyOrder.tags ? shopifyOrder.tags.split(',').map((t: string) => t.trim()) : [];

    const lineItems = shopifyOrder.line_items.map((item: any, index: number) => {
      const properties = item.properties || [];
      const propertiesText = properties.map((p: any) => `${p.name}: ${p.value}`).join('\n');

      return this.parseLineItem({
        shopifyLineItemId: item.id.toString(),
        lineItemIndex: index,
        productId: item.product_id?.toString(),
        tourTitle: item.title,
        variantTitle: item.variant_title || '',
        lineItemPrice: parseFloat(item.price),
        lineItemDiscount: parseFloat(item.total_discount || '0'),
        quantity: item.quantity,
        properties: propertiesText,
        productType: item.product_type || '',
      });
    });

    return {
      shopifyOrderId: shopifyOrder.id.toString(),
      shopifyOrderNumber: shopifyOrder.name.toString(),
      storeId,
      customerName,
      customerEmail,
      customerPhone,
      tags,
      note: shopifyOrder.note,
      shopifyTotalAmount: deposit,
      originalTotalAmount: originalTotal,
      depositAmount: deposit,
      balanceAmount: balance,
      currency: shopifyOrder.currency || 'EUR',
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      lineItems,
    };
  }

  private parseLineItem(data: any): any {
    const parsedData = this.parsePropertiesText(data.properties);
    const pax = this.extractPax(data.variantTitle);
    const campType = this.extractCampType(data.variantTitle);

    return {
      shopifyLineItemId: data.shopifyLineItemId,
      lineItemIndex: data.lineItemIndex,
      productId: data.productId,
      tourTitle: data.tourTitle,
      variantTitle: data.variantTitle,
      lineItemPrice: data.lineItemPrice,
      lineItemDiscount: data.lineItemDiscount,
      quantity: data.quantity,
      properties: data.properties,
      productType: data.productType,
      
      tourDate: parsedData.tourDate,
      tourHour: parsedData.tourHour,
      tourType: this.mapTourType(parsedData.tourType),
      campType: campType,
      pickupLocation: parsedData.pickupLocation,
      pax,
    };
  }

  private parsePropertiesText(text: string): any {
    const lines = text.split('\n');
    const result: any = {};

    for (const line of lines) {
      const lower = line.toLowerCase();
      
      // Tour Type (EN: "Tour type:" / ES: "Tipo del tour:")
      if (lower.includes('tour type:') || lower.includes('tipo del tour:')) {
        result.tourType = line.split(':', 2)[1]?.trim();
      }
      
      // Date (EN: "Arrival date:" / ES: "Fecha:")
      else if (lower.includes('arrival date:') || lower.includes('fecha:')) {
        const dateStr = line.split(':', 2)[1]?.trim();
        result.tourDate = this.parseDate(dateStr);
      }
      
      // Pickup (EN: "Pickup address:" / ES: "Recogida:")
      else if (lower.includes('pickup address:') || lower.includes('recogida:')) {
        result.pickupLocation = line.split(':', 2)[1]?.trim();
      }
      
      // Time - with hour format parsing
      else if (lower.includes('time:') || lower.includes('hour:') || lower.includes('hora:')) {
        const timeStr = line.split(':', 2)[1]?.trim();
        result.tourHour = this.parseHour(timeStr);
      }
    }

    return result;
  }

  private parseHour(hourStr: string | undefined): string | undefined {
    if (!hourStr) return undefined;
    
    const cleaned = hourStr.trim();
    
    // Spanish format: "16h" → "16:00" or "16h30" → "16:30"
    const spanishMatch = cleaned.match(/^(\d{1,2})h(\d{2})?$/);
    if (spanishMatch) {
      const hour = spanishMatch[1].padStart(2, '0');
      const minute = spanishMatch[2] || '00';
      return `${hour}:${minute}`;
    }
    
    // Already correct format: "16:00"
    if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
      return cleaned;
    }
    
    return undefined;
  }

  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    const cleaned = dateStr.trim();

    const monthMap: any = {
      // English
      'jan': 0, 'january': 0, 
      'feb': 1, 'february': 1, 'febrero': 1,
      'mar': 2, 'march': 2, 'marzo': 2,
      'apr': 3, 'april': 3, 
      'may': 4, 'mayo': 4,
      'jun': 5, 'june': 5, 'junio': 5,
      'jul': 6, 'july': 6, 'julio': 6,
      'aug': 7, 'august': 7, 
      'sep': 8, 'september': 8, 'septiembre': 8,
      'oct': 9, 'october': 9, 'octubre': 9,
      'nov': 10, 'november': 10, 'noviembre': 10,
      'dec': 11, 'december': 11, 
      // Spanish unique
      'ene': 0, 'enero': 0,
      'abr': 3, 'abril': 3,
      'ago': 7, 'agosto': 7,
      'dic': 11, 'diciembre': 11,
    };

    // Format: "12 Feb, 2026" or "26 feb, 2026"
    const textParts = cleaned.replace(/,/g, '').split(/\s+/);
    if (textParts.length >= 3) {
      const day = parseInt(textParts[0]);
      const monthStr = textParts[1].toLowerCase();
      const year = parseInt(textParts[2]);
      const month = monthMap[monthStr];

      if (!isNaN(day) && month !== undefined && !isNaN(year)) {
        return new Date(Date.UTC(year, month, day));
      }
    }

    // Format: "26/02/2026" (DD/MM/YYYY)
    const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1]);
      const month = parseInt(slashMatch[2]) - 1;
      const year = parseInt(slashMatch[3]);
      
      const date = new Date(Date.UTC(year, month, day));
      
      if (date.getUTCDate() === day && date.getUTCMonth() === month && date.getUTCFullYear() === year) {
        return date;
      }
    }

    return undefined;
  }

  private extractPax(variantTitle: string): number {
    if (!variantTitle) return 1;
    
    const match = variantTitle.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private extractCampType(variantTitle: string): string | undefined {
    if (!variantTitle) return undefined;
    
    const parts = variantTitle.split('/');
    if (parts.length >= 2) {
      let campType = parts.slice(1).join('/').trim();
      campType = campType.replace(/\s*\([+\-]?\d+[€$£]\)\s*$/g, '');
      return campType.trim() || undefined;
    }
    
    return undefined;
  }

  private mapTourType(tourType: string): any {
    if (!tourType) return undefined;
    const lower = tourType.toLowerCase();
    if (lower.includes('private') || lower.includes('privado')) return 'Private';
    if (lower.includes('shared') || lower.includes('compartido') || lower.includes('grupo')) return 'Shared';
    return undefined;
  }

  private async fetchProductMetafields(store: any, productId: string): Promise<any[]> {
    try {
      const url = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}/products/${productId}/metafields.json`;
      const response = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.metafields || []).map((m: any) => ({ key: m.key, value: m.value, namespace: m.namespace }));
    } catch {
      return [];
    }
  }

  /**
   * Resolves the nested metaobject chain:
   * product.tour_itinerary.itinerary_details → metaobject
   *   .cities → list of metaobjects
   *     .tour_location → metaobject
   *       .name → stop name (string)
   *
   * Returns an array of stop names, or [] if the chain is missing/unreachable.
   */
  private async fetchItineraryStops(store: any, metafields: any[]): Promise<string[]> {
    try {
      const itineraryMF = metafields.find(
        (m) => m.namespace === 'detail' && m.key === 'itinerary',
      );
      if (!itineraryMF?.value || !String(itineraryMF.value).startsWith('gid://')) return [];

      const gqlUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}/graphql.json`;
      const headers = { 'X-Shopify-Access-Token': store.accessToken, 'Content-Type': 'application/json' };

      // Fetch full 4-level structure with type + value at every level
      const query = `
        query GetItinerary($id: ID!) {
          metaobject(id: $id) {
            type
            fields {
              key
              value
              references(first: 30) {
                nodes {
                  ... on Metaobject {
                    type
                    fields {
                      key
                      value
                      references(first: 30) {
                        nodes {
                          ... on Metaobject {
                            type
                            fields {
                              key
                              value
                              references(first: 30) {
                                nodes {
                                  ... on Metaobject {
                                    type
                                    fields { key value }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const res = await fetch(gqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { id: itineraryMF.value } }),
      });

      if (!res.ok) {
        this.logger.warn(`fetchItineraryStops: GraphQL ${res.status}`);
        return [];
      }
      const json = await res.json();
      const metaobject = json?.data?.metaobject;

      this.logger.log(`[STOPS] Root type="${metaobject?.type}" fields: ${(metaobject?.fields ?? []).map((f: any) => f.key).join(', ')}`);

      const rootFields: any[] = metaobject?.fields ?? [];
      const names: string[] = [];

      // Level 1: any field with child nodes (days)
      for (const l1 of rootFields) {
        const dayNodes: any[] = l1?.references?.nodes ?? [];
        if (dayNodes.length === 0) continue;
        this.logger.log(`[STOPS] L1 key="${l1.key}" → ${dayNodes.length} nodes`);

        for (const [di, day] of dayNodes.entries()) {
          const dayFields: any[] = day?.fields ?? [];
          this.logger.log(`[STOPS] Day[${di}] type="${day?.type}" fields: ${dayFields.map((f: any) => f.key).join(', ')}`);

          // Level 2: any field with child nodes (stops), or direct name
          for (const l2 of dayFields) {
            const stopNodes: any[] = l2?.references?.nodes ?? [];
            if (stopNodes.length === 0) continue;
            this.logger.log(`[STOPS] Day[${di}] L2 key="${l2.key}" → ${stopNodes.length} nodes`);

            for (const [si, stop] of stopNodes.entries()) {
              const stopFields: any[] = stop?.fields ?? [];
              this.logger.log(`[STOPS] Stop[${si}] type="${stop?.type}" fields: ${JSON.stringify(stopFields)}`);

              // Check if stop itself has a name/title
              const directName = stopFields.find((f: any) => ['name', 'title', 'label'].includes(f.key));
              if (directName?.value) {
                names.push(String(directName.value).trim());
                continue;
              }

              // Level 3: any field with child nodes (locations)
              for (const l3 of stopFields) {
                const locationNodes: any[] = l3?.references?.nodes ?? [];
                if (locationNodes.length === 0) continue;
                this.logger.log(`[STOPS] Stop[${si}] L3 key="${l3.key}" → ${locationNodes.length} nodes`);

                for (const location of locationNodes) {
                  const locationFields: any[] = location?.fields ?? [];
                  this.logger.log(`[STOPS] Location type="${location?.type}" fields: ${JSON.stringify(locationFields)}`);
                  const nameField = locationFields.find((f: any) => ['name', 'title', 'label'].includes(f.key));
                  if (nameField?.value) names.push(String(nameField.value).trim());
                }
              }
            }
          }
        }
      }

      this.logger.log(`[STOPS] Final names: ${JSON.stringify(names)}`);
      return names;
    } catch (err: any) {
      this.logger.warn(`fetchItineraryStops failed: ${err?.message}`);
      return [];
    }
  }

  private notifyOrdersUpdated(storeId: string): void {
    this.eventsGateway.emitOrdersUpdated(storeId);
  }

  /**
   * Fetches and returns ALL raw metaobject data for an order's itinerary GID.
   * Used for debugging: shows the exact Shopify GraphQL structure so we can
   * identify the correct field names to use in fetchItineraryStops.
   */
  async getMetaobjectRaw(orderId: string): Promise<any> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new Error(`Order ${orderId} not found`);

    const stores = await this.shopifyStoresService.findAll();
    const store = stores.find((s) => s.internalName === order.storeId);
    if (!store) throw new Error(`Store ${order.storeId} not found`);

    const storedMetafields: any[] = Array.isArray(order.shopifyMetadata?.metafields)
      ? order.shopifyMetadata.metafields
      : [];

    // Also fetch fresh metafields from Shopify if we have a product ID
    let freshMetafields: any[] = [];
    if (order.shopifyProductId) {
      freshMetafields = await this.fetchProductMetafields(store, order.shopifyProductId);
    }

    const itineraryGid =
      storedMetafields.find((m) => m.namespace === 'detail' && m.key === 'itinerary')?.value ||
      freshMetafields.find((m) => m.namespace === 'detail' && m.key === 'itinerary')?.value ||
      null;

    let metaobjectRaw: any = null;
    if (itineraryGid && String(itineraryGid).startsWith('gid://')) {
      const gqlUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}/graphql.json`;
      const headers = { 'X-Shopify-Access-Token': store.accessToken, 'Content-Type': 'application/json' };

      const query = `
        query GetItineraryRaw($id: ID!) {
          metaobject(id: $id) {
            id
            type
            handle
            fields {
              key
              type
              value
              references(first: 50) {
                nodes {
                  ... on Metaobject {
                    id
                    type
                    handle
                    fields {
                      key
                      type
                      value
                      references(first: 50) {
                        nodes {
                          ... on Metaobject {
                            id
                            type
                            handle
                            fields {
                              key
                              type
                              value
                              references(first: 50) {
                                nodes {
                                  ... on Metaobject {
                                    id
                                    type
                                    handle
                                    fields { key type value }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const res = await fetch(gqlUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { id: itineraryGid } }),
      });
      const json = await res.json();
      metaobjectRaw = json;
    }

    return {
      orderId: order.id,
      orderNumber: order.shopifyOrderNumber,
      storeId: order.storeId,
      shopifyProductId: order.shopifyProductId,
      shopifyLineItemId: order.shopifyLineItemId,
      itineraryGid,
      storedMetafields,
      freshMetafields,
      metaobjectRaw,
    };
  }

  /**
   * Backfills stops and language for all orders.
   * Re-fetches metafields from Shopify API (not from stored data) so it works
   * even for orders created before metafields were stored correctly.
   */
  async backfillOrders(): Promise<{ stopsUpdated: number; languageUpdated: number; tourCodesUpdated: number }> {
    const stores = await this.shopifyStoresService.findAll();

    // Fetch and cache primaryLocale for each store, then re-read updated entity
    const storeMap = new Map<string, any>();
    for (const store of stores) {
      const locale = await this.shopifyStoresService.fetchAndCachePrimaryLocale(store);
      storeMap.set(store.internalName, { ...store, primaryLocale: locale ?? store.primaryLocale });
    }

    const orders = await this.ordersRepository.find();
    this.logger.log(`[BACKFILL] Total orders: ${orders.length}, stores in map: ${[...storeMap.keys()].join(', ')}`);
    let stopsUpdated = 0;
    let languageUpdated = 0;
    let tourCodesUpdated = 0;

    for (const order of orders) {
      const store = storeMap.get(order.storeId);
      this.logger.log(`[BACKFILL] Order ${order.shopifyOrderNumber} | storeId="${order.storeId}" | storeFound=${!!store} | productId="${order.shopifyProductId}" | hasStops=${!!order.stops} | tourCode="${order.tourCode}" | lang="${order.language}"`);
      const updates: Record<string, any> = {};

      // Backfill stops: use already-stored metafields (they contain the itinerary GID)
      if (!order.stops && store) {
        const metafields: any[] = Array.isArray(order.shopifyMetadata?.metafields)
          ? order.shopifyMetadata.metafields
          : [];
        this.logger.log(`[BACKFILL] Order ${order.shopifyOrderNumber} metafields count: ${metafields.length} | keys: ${metafields.map((m) => `${m.namespace}.${m.key}`).join(', ')}`);
        if (metafields.length > 0) {
          const names = await this.fetchItineraryStops(store, metafields);
          if (names.length > 0) {
            updates.stops = JSON.stringify(names);
            stopsUpdated++;
          }
        }
      }

      // Backfill language: if missing or still the raw internalName (old default)
      if (store?.primaryLocale) {
        const needsUpdate = !order.language || order.language === store.internalName;
        if (needsUpdate) {
          updates.language = store.primaryLocale;
          languageUpdated++;
        }
      }

      // Backfill tourMappingId (FK) + tourCode + shopifyProductId for orders missing them
      if (order.storeId && (!order.tourCode || !order.tourMappingId)) {
        try {
          let mapping: import('../tour-mappings/entities/tour-mapping.entity').TourCodeMapping | null = null;

          if (order.shopifyProductId) {
            // Primary: match by shopifyProductId (stable)
            mapping = await this.tourMappingsService.findByStoreAndProductId(
              order.storeId,
              order.shopifyProductId,
            );
          }

          if (!mapping && order.tourTitle) {
            // Fallback for historical orders where shopifyProductId was never stored:
            // match by productTitle (Shopify product title == order tourTitle)
            mapping = await this.tourMappingsService.findByStoreAndTitle(
              order.storeId,
              order.tourTitle,
            );
            // Also backfill shopifyProductId while we're here
            if (mapping?.shopifyProductId && !order.shopifyProductId) {
              updates.shopifyProductId = mapping.shopifyProductId;
            }
          }

          if (mapping) {
            if (!order.tourMappingId) updates.tourMappingId = mapping.id;
            if (!order.tourCode && mapping.tourCode) updates.tourCode = mapping.tourCode;
            if (!order.tourCode || !order.tourMappingId) tourCodesUpdated++;
          }
        } catch {}
      }

      if (Object.keys(updates).length > 0) {
        await this.ordersRepository.update(order.id, updates);
      }
    }

    this.logger.log(`Backfill complete — stops: ${stopsUpdated}, language: ${languageUpdated}, tourCodes: ${tourCodesUpdated}`);
    return { stopsUpdated, languageUpdated, tourCodesUpdated };
  }

  /**
   * Backfills shopifyProductId on orders where it is missing.
   * Fetches line items from the Shopify Orders API in batches of 250,
   * matches by shopifyLineItemId, and writes the product_id back to the order.
   * Safe: only touches shopifyProductId, nothing else.
   */
  async backfillProductIds(): Promise<{ updated: number; skipped: number }> {
    const stores = await this.shopifyStoresService.findAll();
    const storeMap = new Map(stores.map((s) => [s.internalName, s]));

    // Only process real Shopify orders (not manual orders)
    const orders = await this.ordersRepository.find();
    const needsProductId = orders.filter(
      (o) => !o.shopifyProductId && o.shopifyOrderId && !o.shopifyOrderId.startsWith('MANUAL'),
    );

    this.logger.log(`[BACKFILL-PID] Orders missing shopifyProductId: ${needsProductId.length}`);

    if (needsProductId.length === 0) return { updated: 0, skipped: 0 };

    // Group by storeId so we use the right access token
    const byStore = new Map<string, typeof needsProductId>();
    for (const order of needsProductId) {
      if (!byStore.has(order.storeId)) byStore.set(order.storeId, []);
      byStore.get(order.storeId)!.push(order);
    }

    let updated = 0;
    let skipped = 0;

    for (const [storeId, storeOrders] of byStore) {
      const store = storeMap.get(storeId);
      if (!store) { skipped += storeOrders.length; continue; }

      const baseUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}`;
      const headers = { 'X-Shopify-Access-Token': store.accessToken };

      // Deduplicate shopifyOrderIds and batch 250 per request
      const uniqueOrderIds = [...new Set(storeOrders.map((o) => o.shopifyOrderId))];

      // Build a lookup: shopifyLineItemId → order
      const byLineItemId = new Map(storeOrders.map((o) => [o.shopifyLineItemId, o]));

      for (let i = 0; i < uniqueOrderIds.length; i += 250) {
        const batch = uniqueOrderIds.slice(i, i + 250);
        const url = `${baseUrl}/orders.json?ids=${batch.join(',')}&fields=id,line_items&limit=250`;

        try {
          const res = await fetch(url, { headers });
          if (!res.ok) {
            this.logger.warn(`[BACKFILL-PID] Shopify ${res.status} for store ${storeId}, batch ${i / 250 + 1}`);
            skipped += batch.length;
            continue;
          }
          const data = await res.json();

          for (const shopifyOrder of data.orders ?? []) {
            for (const lineItem of shopifyOrder.line_items ?? []) {
              const order = byLineItemId.get(lineItem.id?.toString());
              if (!order || !lineItem.product_id) continue;
              await this.ordersRepository.update(order.id, {
                shopifyProductId: lineItem.product_id.toString(),
              });
              updated++;
            }
          }
        } catch (err) {
          this.logger.error(`[BACKFILL-PID] Error fetching batch for store ${storeId}: ${err.message}`);
          skipped += batch.length;
        }
      }
    }

    this.logger.log(`[BACKFILL-PID] Done — updated: ${updated}, skipped: ${skipped}`);
    return { updated, skipped };
  }
}