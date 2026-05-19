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
    // Check if this exact endpoint already exists (for ANY user — endpoint is globally unique)
    const byEndpoint = await this.subscriptionsRepo.findOne({
      where: { endpoint: subscription.endpoint },
    });

    if (byEndpoint) {
      if (byEndpoint.userId === userId) return byEndpoint; // already subscribed
      // Same device/browser, different user (e.g. re-login) — reassign to current user
      byEndpoint.userId = userId;
      byEndpoint.keys = subscription.keys;
      this.logger.log(`Reassigned endpoint to user ${userId}`);
      return this.subscriptionsRepo.save(byEndpoint);
    }

    // Remove stale subscriptions from the same push service origin (same device/browser).
    try {
      const newOrigin = new URL(subscription.endpoint).hostname;
      const all = await this.subscriptionsRepo.find({ where: { userId } });
      const stale = all.filter((sub) => {
        try { return new URL(sub.endpoint).hostname === newOrigin; } catch { return false; }
      });
      if (stale.length) {
        await this.subscriptionsRepo.remove(stale);
        this.logger.log(`Removed ${stale.length} stale subscription(s) for user ${userId}`);
      }
    } catch {
      // URL parse failure is non-fatal
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

  async notifyNewOrder(orderId: string, orderNumber: string, storeId?: string) {
    // Drivers are NOT notified on create — new orders are never Completed/Validate
    const eligibleUsers = await this.usersRepo.find({
      where: { role: In(NotificationsService.NEW_ORDER_ROLES) },
      select: ['id', 'role', 'accessibleShopifyStores'],
    });

    if (!eligibleUsers.length) return;

    const filteredUsers = eligibleUsers.filter((u) => {
      if (u.role === UserRole.TRAVEL_AGENT) {
        if (!storeId || !u.accessibleShopifyStores?.length) return false;
        return u.accessibleShopifyStores.includes(storeId);
      }
      return true;
    });

    if (!filteredUsers.length) return;

    await this.sendPushToUsers(
      filteredUsers.map(u => u.id),
      {
        title: `New Order — ${orderNumber}`,
        body: 'A new booking has just been received. Tap to review it.',
        icon: '/web-app-manifest-192x192.png',
        badge: '/web-app-manifest-192x192.png',
        data: { orderId, orderNumber, url: `/orders/${orderId}` },
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      },
      `order ${orderNumber}`,
    );
  }

  // Called from update() when status becomes Completed/Validate OR transport is assigned,
  // so the driver whose transport matches gets notified.
  async notifyDriverTourReady(
    orderId: string,
    orderNumber: string,
    transport: string,
    tourDate?: Date | string | null,
  ) {
    if (!transport) return;

    // Use exact match via relation — transport code must equal assignedTransportCode
    const allDrivers = await this.usersRepo.find({
      where: { role: UserRole.DRIVER },
      select: ['id', 'assignedTransportCode'],
    });

    this.logger.log(
      `Driver notify [${orderNumber}]: looking for transport="${transport}" among ${allDrivers.length} driver(s): ${JSON.stringify(allDrivers.map(d => ({ id: d.id, code: d.assignedTransportCode })))}`,
    );

    const matchingDriverIds = allDrivers
      .filter(d => d.assignedTransportCode && d.assignedTransportCode.trim() === transport.trim())
      .map(d => d.id);

    if (!matchingDriverIds.length) {
      this.logger.warn(
        `Driver notify [${orderNumber}]: no driver matched transport="${transport}". Ensure driver's assignedTransportCode exactly matches the order transport code.`,
      );
      return;
    }

    this.logger.log(`Driver notify [${orderNumber}]: matched ${matchingDriverIds.length} driver(s) → notifying`);

    const dateLabel = tourDate
      ? new Date(tourDate instanceof Date ? tourDate : tourDate + 'T00:00:00')
          .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null;

    await this.sendPushToUsers(
      matchingDriverIds,
      {
        title: `Tour Assignment — ${orderNumber}`,
        body: dateLabel
          ? `You have a tour on ${dateLabel}. Tap to view details.`
          : 'A tour has been assigned to you. Tap to view details.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { orderId, orderNumber, url: `/orders/${orderId}` },
        actions: [
          { action: 'view', title: 'View Tour' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      },
      `driver tour assignment ${orderNumber}`,
    );
  }

  async notifyDriverTourUpdated(
    orderId: string,
    orderNumber: string,
    transport: string,
    changes: Array<{ field: string; oldValue: any; newValue: any }>,
  ) {
    if (!transport || !changes.length) return;

    const allDrivers = await this.usersRepo.find({
      where: { role: UserRole.DRIVER },
      select: ['id', 'assignedTransportCode'],
    });

    const matchingDriverIds = allDrivers
      .filter(d => d.assignedTransportCode && d.assignedTransportCode.trim() === transport.trim())
      .map(d => d.id);

    if (!matchingDriverIds.length) return;

    const fieldLabels: Record<string, string> = {
      status: 'Status',
      customerName: 'Customer name',
      customerPhone: 'Phone',
      customerEmail: 'Email',
      tourDate: 'Date',
      tourHour: 'Hour',
      pax: 'Passengers',
      tourType: 'Tour type',
      campType: 'Camp',
      roomType: 'Room',
      pickupLocation: 'Pickup',
      accommodationName: 'Accommodation',
      transport: 'Transport',
      note: 'Note',
      driverNotes: 'Driver notes',
    };

    const summary = changes
      .map(c => {
        const label = fieldLabels[c.field] ?? c.field;
        const oldVal = c.oldValue ?? '—';
        const newVal = c.newValue ?? '—';
        return `${label}: ${oldVal} → ${newVal}`;
      })
      .join(', ');

    await this.sendPushToUsers(
      matchingDriverIds,
      {
        title: `Tour Updated — ${orderNumber}`,
        body: summary || 'Your tour details have been updated. Tap to view.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { orderId, orderNumber, url: `/orders/${orderId}` },
        actions: [
          { action: 'view', title: 'View Tour' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      },
      `driver tour update ${orderNumber}`,
    );
  }

  async notifyDriverTourRemoved(orderId: string, orderNumber: string, transport: string) {
    if (!transport) return;

    const allDrivers = await this.usersRepo.find({
      where: { role: UserRole.DRIVER },
      select: ['id', 'assignedTransportCode'],
    });

    const matchingDriverIds = allDrivers
      .filter(d => d.assignedTransportCode && d.assignedTransportCode.trim() === transport.trim())
      .map(d => d.id);

    if (!matchingDriverIds.length) return;

    await this.sendPushToUsers(
      matchingDriverIds,
      {
        title: `Tour Unassigned — ${orderNumber}`,
        body: 'A tour has been removed from your schedule.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { orderId, orderNumber, url: `/calendar` },
        actions: [{ action: 'dismiss', title: 'Dismiss' }],
      },
      `driver tour removed ${orderNumber}`,
    );
  }

  private async sendPushToUsers(
    userIds: string[],
    notification: Record<string, any>,
    label: string,
  ) {
    const subscriptions = await this.subscriptionsRepo.find({
      where: { userId: In(userIds) },
    });

    if (!subscriptions.length) {
      this.logger.log(`Push [${label}]: no subscriptions found`);
      return;
    }

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

    this.logger.log(`Push [${label}]: ${sentCount} sent, ${failCount} failed`);
  }
}
