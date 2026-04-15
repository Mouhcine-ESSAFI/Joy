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

      for (const lineItem of parsedOrder.lineItems) {
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

          lineItemProperties: { raw: lineItem.properties },
          shopifyMetadata: { productType: lineItem.productType },
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
          await this.customersService.upsertFromShopify(
            payload.customer,
            store.shopifyDomain,
            store.internalName,
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

        const updates: any = {
          shopifyCreatedAt: new Date(payload.created_at),
          shopifyCustomerId: payload.customer?.id?.toString() || null,
          customerName: parsedOrder.customerName,
          customerEmail: parsedOrder.customerEmail,
          customerPhone: parsedOrder.customerPhone,
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
          lineItemProperties: { raw: lineItem.properties },
          shopifyMetadata: { productType: lineItem.productType },
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
          await this.customersService.upsertFromShopify(
            payload.customer,
            store.shopifyDomain,
            store.internalName,
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

    const customerPhone = shopifyOrder.billing_address?.phone ||
                         shopifyOrder.customer?.phone || 
                         shopifyOrder.phone || 
                         shopifyOrder.shipping_address?.phone ||
                         null;

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

  private notifyOrdersUpdated(storeId: string): void {
    this.eventsGateway.emitOrdersUpdated(storeId);
  }
}