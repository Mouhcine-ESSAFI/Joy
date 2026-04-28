'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Truck, CalendarDays, LogOut } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, user, logout } = useAuthContext();

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
          <button
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
