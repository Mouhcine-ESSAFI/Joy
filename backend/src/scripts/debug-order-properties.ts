import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ShopifyStoresService } from '../shopify-stores/shopify-stores.service';

async function debugOrderProperties() {
  const app = await NestFactory.create(AppModule);
  const shopifyStoresService = app.get(ShopifyStoresService);

  const stores = await shopifyStoresService.findActive();
  const store = stores[0];

  console.log(`🔍 Debugging orders from: ${store.internalName}\n`);

  const url = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}/orders.json?limit=5&status=any`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  const orders = data.orders || [];

  console.log(`Found ${orders.length} orders\n`);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    console.log('═'.repeat(70));
    console.log(`Order #${order.name}`);
    console.log('═'.repeat(70));
    console.log(`Created: ${order.created_at}`);
    
    // Customer details
    console.log(`\nCustomer Object:`);
    console.log(`  Name: ${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`);
    console.log(`  Email: ${order.customer?.email || order.email || 'N/A'}`);
    console.log(`  Phone: ${order.customer?.phone || order.phone || 'N/A'}`);
    
    console.log(`\nBilling Address:`);
    if (order.billing_address) {
      console.log(`  Name: ${order.billing_address.first_name || ''} ${order.billing_address.last_name || ''}`);
      console.log(`  Phone: ${order.billing_address.phone || 'N/A'}`);
    } else {
      console.log(`  (No billing address)`);
    }
    
    console.log(`\nOrder Level:`);
    console.log(`  Email: ${order.email || 'N/A'}`);
    console.log(`  Phone: ${order.phone || 'N/A'}`);
    console.log(`  Contact Email: ${order.contact_email || 'N/A'}`);
    
    console.log(`\nTags: ${order.tags || 'None'}`);
    console.log(`\nLine Items (${order.line_items.length}):`);
    
    order.line_items.forEach((item: any, idx: number) => {
      console.log(`\n  ${idx + 1}. ${item.title}`);
      console.log(`     Variant: ${item.variant_title || 'N/A'}`);
      console.log(`     Product Type: ${item.product_type || 'N/A'}`);
      console.log(`     Properties (${item.properties?.length || 0}):`);
      
      if (item.properties && item.properties.length > 0) {
        item.properties.forEach((prop: any) => {
          console.log(`       - ${prop.name}: ${prop.value}`);
          
          // DATE TIMEZONE ANALYSIS
          if (prop.name.toLowerCase().includes('arrival date') || 
              prop.name.toLowerCase().includes('fecha') ||
              prop.name.toLowerCase().includes('date')) {
            console.log(`\n       🔍 DATE PARSING ANALYSIS:`);
            const dateStr = prop.value;
            console.log(`       Original: "${dateStr}"`);
            
            // Parse with local timezone (OLD WAY - WRONG)
            const dateLocal = parseDate(dateStr, false);
            if (dateLocal) {
              console.log(`       Local TZ:  ${dateLocal.toISOString().split('T')[0]} (WRONG)`);
            }
            
            // Parse with UTC (NEW WAY - CORRECT)
            const dateUTC = parseDate(dateStr, true);
            if (dateUTC) {
              console.log(`       UTC:       ${dateUTC.toISOString().split('T')[0]} (CORRECT)`);
            }
            console.log('');
          }
        });
      } else {
        console.log(`       (No properties)`);
      }
    });
    
    console.log('\n');
  }

  await app.close();
}

function parseDate(dateStr: string, useUTC: boolean): Date | undefined {
  if (!dateStr) return undefined;

  const cleaned = dateStr.trim();

  const monthMap: any = {
    'jan': 0, 'january': 0, 'feb': 1, 'february': 1, 'mar': 2, 'march': 2,
    'apr': 3, 'april': 3, 'may': 4, 'jun': 5, 'june': 5,
    'jul': 6, 'july': 6, 'aug': 7, 'august': 7, 'sep': 8, 'september': 8,
    'oct': 9, 'october': 9, 'nov': 10, 'november': 10, 'dec': 11, 'december': 11,
  };

  // Format: "4 May, 2026"
  const textParts = cleaned.replace(/,/g, '').split(/\s+/);
  if (textParts.length >= 3) {
    const day = parseInt(textParts[0]);
    const monthStr = textParts[1].toLowerCase();
    const year = parseInt(textParts[2]);
    const month = monthMap[monthStr];

    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      if (useUTC) {
        return new Date(Date.UTC(year, month, day));
      } else {
        return new Date(year, month, day);
      }
    }
  }

  // Format: "04/05/2026"
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1]);
    const month = parseInt(slashMatch[2]) - 1;
    const year = parseInt(slashMatch[3]);
    
    if (useUTC) {
      return new Date(Date.UTC(year, month, day));
    } else {
      return new Date(year, month, day);
    }
  }

  return undefined;
}

debugOrderProperties().catch(console.error);