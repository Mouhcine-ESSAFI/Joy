import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // Roles that receive new-order push notifications
  private static readonly NEW_ORDER_ROLES = [
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.TRAVEL_AGENT,
  ];

  constructor(
    @InjectRepository(PushSubscription)
    private subscriptionsRepo: Repository<PushSubscription>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {
    const vapidSubject = process.env.VAPID_SUBJECT;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('VAPID keys not configured — push notifications are disabled');
    } else {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.logger.log('VAPID keys configured successfully');
    }
  }

  async subscribe(userId: string, subscription: any) {
    const existing = await this.subscriptionsRepo.findOne({
      where: { userId, endpoint: subscription.endpoint },
    });

    if (existing) {
      return existing;
    }

    return this.subscriptionsRepo.save({
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
  }

  async getSubscriptionsForUser(userId: string) {
    const subs = await this.subscriptionsRepo.find({ where: { userId } });
    return { count: subs.length, endpoints: subs.map(s => s.endpoint.slice(0, 60) + '...') };
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; icon?: string; data?: any },
  ): Promise<number> {
    const subscriptions = await this.subscriptionsRepo.find({ where: { userId } });
    const expired: PushSubscription[] = [];
    let sent = 0;

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
        sent++;
      } catch (error: any) {
        if (error.statusCode === 410) expired.push(sub);
      }
    }));

    if (expired.length) await this.subscriptionsRepo.remove(expired);
    return sent;
  }

  async notifyNewOrder(orderId: string, orderNumber: string) {
    // Find users with the allowed roles
    const eligibleUsers = await this.usersRepo.find({
      where: { role: In(NotificationsService.NEW_ORDER_ROLES) },
      select: ['id'],
    });

    if (!eligibleUsers.length) return;

    const eligibleUserIds = eligibleUsers.map(u => u.id);

    const subscriptions = await this.subscriptionsRepo.find({
      where: { userId: In(eligibleUserIds) },
    });

    this.logger.log(
      `New order ${orderNumber}: notifying ${subscriptions.length} subscription(s) ` +
      `(roles: Owner, Admin, Travel Agent)`,
    );

    if (!subscriptions.length) return;

    const notification = {
      title: `New Order — ${orderNumber}`,
      body: 'A new booking has just been received. Tap to review it.',
      icon: '/web-app-manifest-192x192.png',
      badge: '/web-app-manifest-192x192.png',
      data: {
        orderId,
        orderNumber,
        url: `/orders/${orderId}`,
      },
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    let sentCount = 0;
    let failCount = 0;
    const expired: PushSubscription[] = [];

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(notification),
        );
        sentCount++;
      } catch (error: any) {
        failCount++;
        this.logger.warn(`Push failed for user ${sub.userId}: ${error.message}`);
        if (error.statusCode === 410) expired.push(sub);
      }
    }

    if (expired.length) {
      await this.subscriptionsRepo.remove(expired);
      this.logger.log(`Removed ${expired.length} expired subscription(s)`);
    }

    this.logger.log(`Push summary for order ${orderNumber}: ${sentCount} sent, ${failCount} failed`);
  }
}
