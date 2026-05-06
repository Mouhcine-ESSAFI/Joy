import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ShopifyStoresService } from '../shopify-stores/shopify-stores.service';
import { OrdersService } from '../orders/orders.service';
import { ShopifyParserService } from '../shopify-parser/shopify-parser.service';
import { Order } from '../orders/entities/order.entity';
import { CustomersService } from '../shopify-customers/customers.service';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private isSyncing = false;

  constructor(
    private shopifyStoresService: ShopifyStoresService,
    private ordersService: OrdersService,
    private shopifyParserService: ShopifyParserService,
    private customersService: CustomersService,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  // 🚀 Run on app startup
  async onModuleInit() {
    this.logger.log('🚀 App started. Checking for missing orders...');
    // Wait 5 seconds for app to fully initialize
    setTimeout(() => {
      this.syncAllActiveStores();
    }, 5000);
  }

  // 🕐 Run every 6 hours to check for missing orders
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledSync() {
    this.logger.log('⏰ Scheduled sync started...');
    await this.syncAllActiveStores();
  }

  async syncAllActiveStores(): Promise<void> {
    if (this.isSyncing) {
      this.logger.log('⏸️ Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      const activeStores = await this.shopifyStoresService.findActiveStores();

      this.logger.log(`📊 Found ${activeStores.length} active store(s)`);

      for (const store of activeStores) {
        try {
          await this.syncStore(store.id);
        } catch (error) {
          this.logger.error(`❌ Sync failed for store ${store.internalName}: ${error.message}`);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async syncStore(storeId: string): Promise<void> {
    const store = await this.shopifyStoresService.findOne(storeId);

    if (!store.isActive) {
      this.logger.log(`⏸️ Store ${store.internalName} is inactive. Skipping sync.`);
      return;
    }

    this.logger.log(`🔄 Syncing store: ${store.internalName} (${store.shopifyDomain})`);

    // Find latest order in our database for this store
    const latestOrder = await this.ordersRepository.findOne({
      where: { storeId: store.internalName },
      order: { createdAt: 'DESC' },
    });

    const sinceDate = latestOrder?.createdAt || null;

    this.logger.log(
      sinceDate
        ? `📅 Fetching orders since: ${sinceDate.toISOString()}`
        : `📅 Fetching all orders (initial sync)`
    );

    // Fetch orders from Shopify
    const orderCount = await this.fetchOrdersFromShopify(store, sinceDate);

    this.logger.log(`✅ Synced ${orderCount} order(s) from ${store.internalName}`);

    // Update sync timestamp
    await this.shopifyStoresService.updateSyncTimestamp(storeId);

    if (!store.initialSyncCompleted) {
      await this.shopifyStoresService.markInitialSyncCompleted(storeId);
      this.logger.log(`🎉 Initial sync completed for ${store.internalName}`);
    }
  }

  private async fetchOrdersFromShopify(store: any, sinceDate: Date | null): Promise<number> {
    const baseUrl = `https://${store.shopifyDomain}/admin/api/${store.apiVersion}`;
    const headers = {
      'X-Shopify-Access-Token': store.accessToken,
      'Content-Type': 'application/json',
    };

    const allOrders: any[] = [];
    let nextPageUrl: string | null = null;
    let isFirstPage = true;

    try {
      // Fetch all orders with cursor-based pagination
      while (isFirstPage || nextPageUrl) {
        let url: string;
        
        if (isFirstPage) {
          // First page - use query parameters
          url = `${baseUrl}/orders.json?status=any&limit=250`;
          if (sinceDate) {
            url += `&created_at_min=${sinceDate.toISOString()}`;
          }
          isFirstPage = false;
        } else {
          // Subsequent pages - use the full URL from Link header
          url = nextPageUrl!;
        }

        this.logger.log(`🌐 Fetching: ${isFirstPage ? 'first page' : 'next page'}...`);

        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Shopify API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        allOrders.push(...data.orders);

        this.logger.log(`📦 Fetched ${data.orders.length} orders (Total: ${allOrders.length})`);

        // Check for next page in Link header
        const linkHeader = response.headers.get('Link');
        nextPageUrl = null;

        if (linkHeader) {
          // Parse Link header for next page
          // Format: <https://store.myshopify.com/admin/api/2024-01/orders.json?page_info=xxxxx>; rel="next"
          const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (nextMatch) {
            nextPageUrl = nextMatch[1];
          }
        }

        // If no more pages, break
        if (!nextPageUrl) {
          break;
        }

        // Rate limiting: wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.logger.log(`📥 Total orders fetched from Shopify: ${allOrders.length}`);

      // Batch upsert unique customers from all fetched orders
      const uniqueCustomers = allOrders
        .map((o) => o.customer)
        .filter((c): c is NonNullable<typeof c> => !!c?.id);
      const customerMap = new Map(uniqueCustomers.map((c) => [c.id.toString(), c]));
      if (customerMap.size > 0) {
        try {
          await this.customersService.upsertManyFromShopify(
            Array.from(customerMap.values()),
            store.shopifyDomain,
            store.internalName,
          );
        } catch (e: any) {
          this.logger.warn(`Customer sync failed: ${e.message}`);
        }
      }

      // Batch duplicate check: collect all shopifyOrderIds, then query once
      const shopifyOrderIds = allOrders.map((o) => o.id.toString());
      const existingOrders = shopifyOrderIds.length
        ? await this.ordersRepository.find({
            where: { shopifyOrderId: In(shopifyOrderIds) },
            select: ['shopifyOrderId', 'lineItemIndex'],
          })
        : [];
      const existingSet = new Set(
        existingOrders.map((o) => `${o.shopifyOrderId}-${o.lineItemIndex}`),
      );

      // Process and save orders
      let savedCount = 0;
      for (const shopifyOrder of allOrders) {
        try {
          const parsedOrder = this.shopifyParserService.parseShopifyOrderJSON(
            shopifyOrder,
            store.internalName
          );

          // Create orders for each line item
          for (const lineItem of parsedOrder.lineItems) {
            const key = `${parsedOrder.shopifyOrderId}-${lineItem.lineItemIndex}`;
            if (existingSet.has(key)) continue;

            const orderDto = {
              shopifyOrderId: parsedOrder.shopifyOrderId,
              shopifyOrderNumber: parsedOrder.shopifyOrderNumber,
              shopifyLineItemId: lineItem.shopifyLineItemId,
              lineItemIndex: lineItem.lineItemIndex,
              storeId: parsedOrder.storeId,
              shopifyCreatedAt: new Date(shopifyOrder.created_at),

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

            await this.ordersService.create(orderDto as any);
            existingSet.add(key); // prevent re-insertion within same batch
            savedCount++;
          }
        } catch (error: any) {
          this.logger.error(`❌ Error processing order ${shopifyOrder.id}: ${error.message}`);
        }
      }

      this.logger.log(`💾 Saved ${savedCount} new orders to database`);
      return savedCount;

    } catch (error: any) {
      this.logger.error(`❌ Error fetching orders: ${error.message}`);
      throw error;
    }
  }
}
