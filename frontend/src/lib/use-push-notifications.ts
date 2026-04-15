'use client';

import { useEffect, useState } from 'react';
import api from './api-client';

export type PushSubscriptionError =
  | 'unsupported'
  | 'permission_denied'
  | 'vapid_missing'
  | 'subscription_failed'
  | 'backend_failed';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if ('Notification' in window) {
      setPermission(Notification.permission);

      // If permission is already granted, try to ensure a subscription exists
      if (supported && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(() => {
          subscribeToPush();
        }).catch(() => {/* sw not ready yet, ignore */});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = async (): Promise<{ success: boolean; error?: PushSubscriptionError }> => {
    if (!isSupported) {
      return { success: false, error: 'unsupported' };
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        return { success: false, error: 'permission_denied' };
      }

      return subscribeToPush();
    } catch {
      return { success: false, error: 'subscription_failed' };
    }
  };

  const subscribeToPush = async (): Promise<{ success: boolean; error?: PushSubscriptionError }> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        return { success: false, error: 'vapid_missing' };
      }

      const appServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // If an existing subscription exists but was made with a different VAPID key,
      // unsubscribe first so we get a fresh one with the current key.
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        const existingKey = existingSubscription.options?.applicationServerKey;
        const existingKeyBase64 = existingKey
          ? btoa(String.fromCharCode(...new Uint8Array(existingKey as ArrayBuffer)))
          : null;
        const currentKeyBase64 = btoa(String.fromCharCode(...appServerKey));

        if (existingKeyBase64 !== currentKeyBase64) {
          await existingSubscription.unsubscribe();
        }
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      await api.notifications.subscribe(subscription.toJSON());
      return { success: true };
    } catch (err: any) {
      console.error('Push subscription failed:', err?.message);
      return { success: false, error: 'backend_failed' };
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
