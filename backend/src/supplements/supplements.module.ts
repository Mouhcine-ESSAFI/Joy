import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplementsService } from './supplements.service';
import { SupplementsController } from './supplements.controller';
import { Supplement } from './entities/supplement.entity';
import { OrdersModule } from '../orders/orders.module'; // ⭐ NEW

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplement]),
    OrdersModule, // ⭐ NEW - import OrdersModule to use OrdersService
  ],
  controllers: [SupplementsController],
  providers: [SupplementsService],
})
export class SupplementsModule {}