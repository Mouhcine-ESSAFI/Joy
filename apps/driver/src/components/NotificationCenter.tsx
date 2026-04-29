'use client';

import { useState, useEffect } from 'react';
import { Bell, Trash2, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { usePushNotifications } from '@/lib/use-push-notifications';

interface DriverNotification {
  id: string;
  title: string;
  body: string;
  data?: { orderId?: string; url?: string };
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'joy-driver-notifications';
const MAX_NOTIFICATIONS = 30;

export function NotificationCenter() {
  const router = useRouter();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const notifGranted = permission === 'granted';
  const notifDenied = permission === 'denied';

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setNotifications(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NOTIFICATION') {
        const { title, body, data } = event.data.notification;
        const newNotif: DriverNotification = {
          id: Date.now().toString(),
          title,
          body,
          data,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => {
          const updated = [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, isRead: true } : n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, isRead: true }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleClick = (n: DriverNotification) => {
    markAsRead(n.id);
    setIsOpen(false);
    const url = n.data?.url ?? (n.data?.orderId ? `/orders/${n.data.orderId}` : '/calendar');
    router.push(url);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!isSupported) return null;

  if (notifDenied) {
    return <BellOff className="h-5 w-5 text-muted-foreground/50" title="Notifications blocked in browser settings" />;
  }

  // Not yet granted — plain button that triggers the browser permission dialog
  if (!notifGranted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        title="Enable notifications"
        onClick={() => requestPermission()}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500" />
      </Button>
    );
  }

  // Granted — full notification center with dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" title="Notifications">
          <Bell className="h-5 w-5 text-primary" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[480px] overflow-y-auto">
          <DropdownMenuLabel className="flex items-center justify-between sticky top-0 bg-background z-10">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs"
                  onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}>
                  Mark all read
                </Button>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tour assignments will appear here</p>
            </div>
          ) : (
            <>
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="cursor-pointer p-4 focus:bg-accent" onClick={() => handleClick(n)}>
                  <div className="flex gap-3 w-full">
                    {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              </div>
            </>
          )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
