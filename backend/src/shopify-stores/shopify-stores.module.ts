import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopifyStore } from './entities/shopify-store.entity';
import { ShopifyStoresService } from './shopify-stores.service';
import { ShopifyStoresController } from './shopify-stores.controller';
import { SyncModule } from '../sync/sync.module'; // ⭐ Import SyncModule

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopifyStore]),
    forwardRef(() => SyncModule), // ⭐ Use forwardRef
  ],
  controllers: [ShopifyStoresController],
  providers: [ShopifyStoresService],
  exports: [ShopifyStoresService],
})
export class ShopifyStoresModule {}