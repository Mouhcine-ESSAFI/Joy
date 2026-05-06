'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Truck, CalendarDays, LogOut, Sun, Moon, Download } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/NotificationCenter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getInitials(name?: string | null) {
  if (!name) return 'D';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, user, logout } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated && pathname !== '/login') router.push('/login');
    if (isAuthenticated && pathname === '/login') router.replace('/calendar');
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

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top nav */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-auto">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <Truck className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">Joy Driver</span>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <NotificationCenter />

          {/* User avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium leading-none">{user?.name || 'Driver'}</p>
                  <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5 w-fit">
                    Driver
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Theme toggle */}
              <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                {isDark
                  ? <Sun className="h-4 w-4 mr-2" />
                  : <Moon className="h-4 w-4 mr-2" />}
                {isDark ? 'Light mode' : 'Dark mode'}
              </DropdownMenuItem>

              {/* Install app — only shown when browser supports it */}
              {canInstall && (
                <DropdownMenuItem onClick={install}>
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
