import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post('subscribe')
  async subscribe(@Request() req, @Body() subscription: any) {
    return this.notificationsService.subscribe(req.user.id, subscription);
  }

  @Get('subscriptions')
  async listSubscriptions(@Request() req) {
    return this.notificationsService.getSubscriptionsForUser(req.user.id);
  }

  @Post('test')
  async test(@Request() req, @Body() body: { title?: string; body?: string }) {
    const count = await this.notificationsService.sendToUser(req.user.id, {
      title: body?.title || '🔔 Test Notification',
      body: body?.body || 'Push notifications are working correctly!',
      icon: '/web-app-manifest-192x192.png',
      data: { type: 'test', timestamp: new Date().toISOString() },
    });
    return { message: 'Notification sent', subscriptionsReached: count };
  }
}