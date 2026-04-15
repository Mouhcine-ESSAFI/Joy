import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookLog } from './entities/webhook-log.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';
import { ShopifyStoresModule } from '../shopify-stores/shopify-stores.module';
import { ShopifyStore } from '../shopify-stores/entities/shopify-store.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { CustomersModule } from '../shopify-customers/customers.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookLog, ShopifyStore, Order]),
    OrdersModule,
    ShopifyStoresModule,
    NotificationsModule,
    CustomersModule,
    EventsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}