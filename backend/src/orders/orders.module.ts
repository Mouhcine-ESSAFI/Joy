import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderHistory } from './entities/order-history.entity'; // ⭐ NEW
import { TourMappingsModule } from '../tour-mappings/tour-mappings.module';
import { RoomTypeRulesModule } from '../room-type-rules/room-type-rules.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderHistory]),
    TourMappingsModule,
    RoomTypeRulesModule,
    NotificationsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}