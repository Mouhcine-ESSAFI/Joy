import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
export class MaintenanceController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Reset all transactional data: orders, supplements, order history,
   * webhook logs, customers, and push subscriptions.
   * Configuration data (users, stores, room rules, transport types, tour mappings) is preserved.
   */
  @Post('reset-orders')
  @HttpCode(HttpStatus.OK)
  async resetOrders() {
    await this.dataSource.transaction(async (manager) => {
      await manager.query('DELETE FROM supplements');
      await manager.query('DELETE FROM order_history');
      await manager.query('DELETE FROM webhook_logs');
      await manager.query('DELETE FROM push_subscriptions');
      await manager.query('DELETE FROM customers');
      await manager.query('DELETE FROM orders');
    });

    return {
      success: true,
      message: 'All orders, customers, and related data have been deleted.',
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * Reset Shopify store sync state so that the next sync
   * will re-fetch all orders from the beginning.
   * Does NOT delete any orders.
   */
  @Post('reset-sync')
  @HttpCode(HttpStatus.OK)
  async resetSync() {
    await this.dataSource.query(`
      UPDATE shopify_stores
      SET "lastSyncedAt" = NULL,
          "lastOrderFetchedAt" = NULL,
          "initialSyncCompleted" = false
    `);

    return {
      success: true,
      message: 'Store sync state has been reset. The next sync will re-fetch all orders.',
      resetAt: new Date().toISOString(),
    };
  }
}
