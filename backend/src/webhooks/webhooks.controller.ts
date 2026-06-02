import { Controller, Post, Get, Param, Query, Body, Headers, UseGuards, HttpCode, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ShopifyWebhookGuard } from './webhooks.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('webhooks/shopify')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('orders/create')
  @HttpCode(200)
  @UseGuards(ShopifyWebhookGuard)
  async handleOrderCreate(
    @Body() payload: any,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(`📩 Webhook received: orders/create from ${shopDomain}`);
    this.logger.log(`📦 Order ID: ${payload?.id}, Order #: ${payload?.name}`);
    
    try {
      await this.webhooksService.handleOrderCreate(payload, shopDomain);
      this.logger.log('✅ Order created successfully');
      return { success: true, message: 'Order created successfully' };
    } catch (error) {
      this.logger.error(`❌ Error creating order: ${error.message}`);
      throw error;
    }
  }

  @Post('orders/updated')
  @HttpCode(200)
  @UseGuards(ShopifyWebhookGuard)
  async handleOrderUpdate(
    @Body() payload: any,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(`📩 Webhook received: orders/updated from ${shopDomain}`);
    this.logger.log(`📦 Order ID: ${payload?.id}, Order #: ${payload?.name}`);
    
    try {
      await this.webhooksService.handleOrderUpdate(payload, shopDomain);
      this.logger.log('✅ Order updated successfully');
      return { success: true, message: 'Order updated successfully' };
    } catch (error) {
      this.logger.error(`❌ Error updating order: ${error.message}`);
      throw error;
    }
  }

  @Post('backfill')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @HttpCode(200)
  backfill() {
    return this.webhooksService.backfillOrders();
  }

  @Post('backfill-product-ids')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner')
  @HttpCode(200)
  backfillProductIds() {
    return this.webhooksService.backfillProductIds();
  }

  @Get('orders/:orderId/metaobject-debug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Admin')
  metaobjectDebug(@Param('orderId') orderId: string) {
    return this.webhooksService.getMetaobjectRaw(orderId);
  }

  // Test any GID directly: GET /webhooks/shopify/metaobject-query?storeId=joy&gid=gid://shopify/Metaobject/116133232719
  @Get('metaobject-query')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Owner', 'Admin')
  metaobjectQuery(
    @Query('storeId') storeId: string,
    @Query('gid') gid: string,
  ) {
    return this.webhooksService.queryMetaobjectByGid(storeId, gid);
  }

  @Post('orders/cancelled')
  @HttpCode(200)
  @UseGuards(ShopifyWebhookGuard)
  async handleOrderCancel(
    @Body() payload: any,
    @Headers('x-shopify-shop-domain') shopDomain: string,
  ) {
    this.logger.log(`📩 Webhook received: orders/cancelled from ${shopDomain}`);
    this.logger.log(`📦 Order ID: ${payload?.id}, Order #: ${payload?.name}`);
    
    try {
      await this.webhooksService.handleOrderCancel(payload, shopDomain);
      this.logger.log('✅ Order cancelled successfully');
      return { success: true, message: 'Order cancelled successfully' };
    } catch (error) {
      this.logger.error(`❌ Error cancelling order: ${error.message}`);
      throw error;
    }
  }
}
