'use client';

import { useEffect } from 'react';
import { usePushNotifications } from '@/lib/use-push-notifications';
import { useAuthContext } from '@/context/AuthContext';

export function PushSetup() {
  const { isAuthenticated } = useAuthContext();
  const { permission, isSupported, requestPermission } = usePushNotifications();

  // Register service worker
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {/* ignore */});
  }, []);

  // Auto-request permission once authenticated
  useEffect(() => {
    if (!isAuthenticated || !isSupported) return;
    if (permission === 'default') {
      requestPermission();
    }
  }, [isAuthenticated, isSupported, permission, requestPermission]);

  return null;
}
