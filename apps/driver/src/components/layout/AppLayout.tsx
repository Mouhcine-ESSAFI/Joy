'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Truck, CalendarDays, LogOut, Bell, BellOff, Download } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/lib/use-push-notifications';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, user, logout } = useAuthContext();
  const { permission, isSupported, requestPermission } = usePushNotifications();
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    if (isAuthenticated && pathname === '/login') {
      router.replace('/calendar');
    }
  }, [pathname, isAuthenticated, loading, router]);

  if (pathname === '/login') return <>{children}</>;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const notifGranted = permission === 'granted';
  const notifDenied = permission === 'denied';

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top nav */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Joy Driver</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>

          {/* Install button — only visible when installable */}
          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-2.5 py-1.5 rounded-full transition-opacity hover:opacity-90"
              title="Install app"
            >
              <Download className="h-3.5 w-3.5" />
              Install
            </button>
          )}

          {/* Notification bell */}
          {isSupported && !notifDenied && (
            <button
              type="button"
              onClick={() => { if (!notifGranted) requestPermission(); }}
              title={notifGranted ? 'Notifications enabled' : 'Enable notifications'}
              className={cn(
                'relative transition-colors',
                notifGranted
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bell className="h-5 w-5" />
              {!notifGranted && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          )}
          {isSupported && notifDenied && (
            <BellOff className="h-5 w-5 text-muted-foreground/50" title="Notifications blocked in browser settings" />
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 bg-background border-t flex">
        <Link
          href="/calendar"
          className={cn(
            'flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors',
            pathname === '/calendar' ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CalendarDays className="h-5 w-5" />
          Calendar
        </Link>
      </nav>
    </div>
  );
}
