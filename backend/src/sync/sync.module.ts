import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { ShopifyStoresModule } from '../shopify-stores/shopify-stores.module';
import { OrdersModule } from '../orders/orders.module';
import { ShopifyParserModule } from '../shopify-parser/shopify-parser.module';
import { Order } from '../orders/entities/order.entity';
import { CustomersModule } from '../shopify-customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    forwardRef(() => ShopifyStoresModule),
    OrdersModule,
    ShopifyParserModule,
    CustomersModule,
  ],
  providers: [
    SyncService,
    // ⭐ ADD THIS: Provide SyncService with string token
    {
      provide: 'SyncService',
      useExisting: SyncService,
    },
  ],
  exports: [
    SyncService,
    'SyncService', // ⭐ Export the string token too
  ],
})
export class SyncModule {}