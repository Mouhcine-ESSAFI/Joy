import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  /**
   * Every day at 01:00 UTC: mark New/Updated orders whose tour date has passed as Completed.
   * This covers tours that finished yesterday or earlier and were never manually closed.
   */
  @Cron('0 1 * * *')
  async autoCompleteExpiredOrders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const result = await this.ordersRepository
      .createQueryBuilder()
      .update(Order)
      .set({ status: OrderStatus.COMPLETED })
      .where('status IN (:...statuses)', {
        statuses: [OrderStatus.NEW, OrderStatus.UPDATED],
      })
      .andWhere('tourDate IS NOT NULL')
      .andWhere('tourDate < :today', { today: todayStr })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `[Scheduler] Auto-completed ${result.affected} order(s) with past tour dates (before ${todayStr})`,
      );
    }
  }
}
