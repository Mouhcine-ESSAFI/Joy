import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TourMappingsService } from './tour-mappings.service';
import { TourMappingsController } from './tour-mappings.controller';
import { TourCodeMapping } from './entities/tour-mapping.entity';
import { Order } from '../orders/entities/order.entity';
import { ShopifyStore } from '../shopify-stores/entities/shopify-store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TourCodeMapping, Order, ShopifyStore])],
  controllers: [TourMappingsController],
  providers: [TourMappingsService],
  exports: [TourMappingsService],
})
export class TourMappingsModule {}