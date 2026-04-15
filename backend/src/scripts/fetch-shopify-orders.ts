import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ShopifyStoresService } from '../shopify-stores/shopify-stores.service';
import { OrdersService } from '../orders/orders.service';

async function fetchAllShopifyOrders() {
  const app = await NestFactory.create(AppModule);
  const shopifyStoresService = app.get(ShopifyStoresService);
  const ordersService = app.get(OrdersService);

  console.log('🔍 Fetching Shopify stores...\n');

  const stores = await shopifyStoresService.findActive();

  if (stores.length === 0) {
    console.log('❌ No active stores found! Run: npm run seed');
    await app.close();
    return;
  }

  console.log(`✅ Found ${stores.length} active store(s):\n`);


  let grandTotalFetched = 0;
  let grandTotalCreated = 0;
  let grandTotalErrors = 0;

  for (const store of stores) {
    console.log(`\n📦 Fetching orders from: ${store.internalName} (${store.shopifyDomain})`);
    console.log('═'.repeat(60));

    try {
      const url = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}/orders.json?limit=250&status=any`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': store.accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const allShopifyOrders = data.orders || [];

      console.log(`\n✅ Fetched ${allShopifyOrders.length} orders\n`);
      grandTotalFetched += allShopifyOrders.length;


      let createdCount = 0;
      let errorCount = 0;

      for (const shopifyOrder of allShopifyOrders) {
        try {
          const parsedOrder = parseShopifyOrderJSON(shopifyOrder, store.internalName);

          for (const lineItem of parsedOrder.lineItems) {
            try {
              const orderDto = {
                shopifyOrderId: parsedOrder.shopifyOrderId,
                shopifyOrderNumber: parsedOrder.shopifyOrderNumber,
                shopifyLineItemId: lineItem.shopifyLineItemId,
                lineItemIndex: lineItem.lineItemIndex,
                storeId: parsedOrder.storeId,

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

              await ordersService.create(orderDto as any);
              createdCount++;

              console.log(`  ✅ ${lineItem.tourTitle.substring(0, 50)}... (${lineItem.tourDate ? lineItem.tourDate.toISOString().split('T')[0] : 'no date'})`);
            } catch (error) {
              errorCount++;
              console.error(`  ❌ Error creating order: ${error.message}`);
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Error processing order: ${error.message}`);
        }
      }

      console.log('\n─────────────────────────────────────────');
      console.log(`Store ${store.internalName}:`);
      console.log(`  ✅ Created: ${createdCount} orders`);
      console.log(`  ❌ Errors: ${errorCount}`);
      console.log('─────────────────────────────────────────');

      grandTotalCreated += createdCount;
      grandTotalErrors += errorCount;

    } catch (error) {
      console.error(`\n❌ Error fetching from ${store.internalName}:`, error.message);
      grandTotalErrors++;
    }
  }

  console.log('\n\n═══════════════════════════════════════');
  console.log('✅ Import completed!');
  console.log('═══════════════════════════════════════');
  console.log(`📥 Total Fetched: ${grandTotalFetched} Shopify orders`);
  console.log(`✅ Total Created: ${grandTotalCreated} order records`);
  console.log(`❌ Total Errors: ${grandTotalErrors}`);
  console.log('═══════════════════════════════════════');

  await app.close();
}

function parseShopifyOrderJSON(shopifyOrder: any, storeId: string): any {
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

  // FIXED: Billing address phone FIRST!
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

    return parseLineItem({
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

function parseLineItem(data: any): any {
  const parsedData = parsePropertiesText(data.properties);
  const pax = extractPax(data.variantTitle);
  const campType = extractCampType(data.variantTitle);

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
    tourType: mapTourType(parsedData.tourType),
    campType: campType,
    pickupLocation: parsedData.pickupLocation,
    pax,
  };
}

function parsePropertiesText(text: string): any {
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
      result.tourDate = parseDate(dateStr);
    }
    
    // Pickup (EN: "Pickup address:" / ES: "Recogida:")
    else if (lower.includes('pickup address:') || lower.includes('recogida:')) {
      result.pickupLocation = line.split(':', 2)[1]?.trim();
    }
    
    // Time - FIX HOUR FORMAT
    else if (lower.includes('time:') || lower.includes('hour:') || lower.includes('hora:')) {
      const timeStr = line.split(':', 2)[1]?.trim();
      result.tourHour = parseHour(timeStr);
    }
  }

  return result;
}

// NEW FUNCTION: Parse hour format
function parseHour(hourStr: string | undefined): string | undefined {
  if (!hourStr) return undefined;
  
  // "16h" → "16:00"
  // "16h30" → "16:30"
  // "16:00" → "16:00" (already correct)
  
  const cleaned = hourStr.trim();
  
  // Spanish format: "16h" or "16h30"
  const spanishMatch = cleaned.match(/^(\d{1,2})h(\d{2})?$/);
  if (spanishMatch) {
    const hour = spanishMatch[1].padStart(2, '0');
    const minute = spanishMatch[2] || '00';
    return `${hour}:${minute}`;
  }
  
  // Already in correct format: "16:00"
  if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
    return cleaned;
  }
  
  return undefined;
}

// UPDATED: Supports both EN and ES months
function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  const cleaned = dateStr.trim();

  const monthMap: any = {
    // English
    'jan': 0, 'january': 0, 
    'feb': 1, 'february': 1, 'febrero': 1,  // feb same in both
    'mar': 2, 'march': 2, 'marzo': 2,        // mar same in both
    'apr': 3, 'april': 3, 
    'may': 4, 'mayo': 4,                     // may same in both
    'jun': 5, 'june': 5, 'junio': 5,        // jun same in both
    'jul': 6, 'july': 6, 'julio': 6,        // jul same in both
    'aug': 7, 'august': 7, 
    'sep': 8, 'september': 8, 'septiembre': 8, // sep same in both
    'oct': 9, 'october': 9, 'octubre': 9,   // oct same in both
    'nov': 10, 'november': 10, 'noviembre': 10, // nov same in both
    'dec': 11, 'december': 11, 
    // Spanish unique
    'ene': 0, 'enero': 0,   // January in Spanish
    'abr': 3, 'abril': 3,   // April in Spanish
    'ago': 7, 'agosto': 7,  // August in Spanish
    'dic': 11, 'diciembre': 11, // December in Spanish
  };

  // Format: "12 Feb, 2026" or "26 feb, 2026"
  const textParts = cleaned.replace(/,/g, '').split(/\s+/);
  if (textParts.length >= 3) {
    const day = parseInt(textParts[0]);
    const monthStr = textParts[1].toLowerCase();
    const year = parseInt(textParts[2]);
    const month = monthMap[monthStr];

    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(Date.UTC(year, month, day)); // UTC to avoid timezone issues!
    }
  }

  // Format: "26/02/2026" (DD/MM/YYYY)
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const month = parseInt(slashMatch[2]) - 1;
    const year = parseInt(slashMatch[3]);
    
    const date = new Date(Date.UTC(year, month, day)); // UTC!
    
    if (date.getUTCDate() === day && date.getUTCMonth() === month && date.getUTCFullYear() === year) {
      return date;
    }
  }

  return undefined;
}

// UPDATED: Works for both "2 / Camp" and just "2"
function extractPax(variantTitle: string): number {
  if (!variantTitle) return 1;
  
  const match = variantTitle.match(/^(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

function extractCampType(variantTitle: string): string | undefined {
  if (!variantTitle) return undefined;
  
  const parts = variantTitle.split('/');
  if (parts.length >= 2) {
    let campType = parts.slice(1).join('/').trim();
    campType = campType.replace(/\s*\([+\-]?\d+[€$£]\)\s*$/g, '');
    return campType.trim() || undefined;
  }
  
  return undefined;
}

function mapTourType(tourType: string): any {
  if (!tourType) return undefined;
  const lower = tourType.toLowerCase();
  if (lower.includes('private') || lower.includes('privado')) return 'Private';
  if (lower.includes('shared') || lower.includes('compartido') || lower.includes('grupo')) return 'Shared';
  return undefined;
}

fetchAllShopifyOrders().catch(console.error);