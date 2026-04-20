'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, Calendar, Home, LogOut, PlusCircle, Building, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/context/AuthContext';

const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || 'one.joymorocco.com';

const nav = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', exact: true },
  { href: '/orders', icon: Briefcase, label: 'Orders', exact: false },
  { href: '/calendar', icon: Calendar, label: 'Calendar', exact: false },
];

const ROLE_COLORS: Record<string, string> = {
  Owner: 'bg-amber-100 text-amber-800 border-amber-200',
  Admin: 'bg-blue-100 text-blue-800 border-blue-200',
  'Travel Agent': 'bg-green-100 text-green-800 border-green-200',
  Finance: 'bg-purple-100 text-purple-800 border-purple-200',
  Driver: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function AppSidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getIsActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const adminUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${ADMIN_HOST}/admin/users`
    : `https://${ADMIN_HOST}/admin/users`;

  const canSeeAdmin = user?.role === 'Owner' || user?.role === 'Admin';
  const canCreateOrder = user?.role === 'Owner' || user?.role === 'Admin';

  return (
    <div className="flex h-full max-h-screen flex-col bg-card">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
          <Logo className="h-6 w-6" />
          <span className={cn('text-base tracking-tight', isCollapsed && 'sr-only')}>Joy Booking</span>
        </Link>
        {!isCollapsed && (
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground border rounded-full px-2 py-0.5 bg-muted">
            BOOKING
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className={cn('grid items-start gap-y-0.5', isCollapsed ? 'px-2 py-2' : 'px-3 py-2')}>
          {nav.map((item) => {
            const isActive = getIsActive(item.href, item.exact);
            if (isCollapsed) {
              return (
                <TooltipProvider key={item.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all border-l-2 pl-[10px]',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                {item.label}
              </Link>
            );
          })}

          {/* New Order quick link — Owner and Admin only */}
          {!isCollapsed && canCreateOrder && (
            <Link
              href="/orders/new"
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all border-l-2 pl-[10px] mt-1',
                pathname === '/orders/new'
                  ? 'bg-primary/10 text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
              )}
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              New Order
            </Link>
          )}
        </nav>

        {/* Admin portal cross-link */}
        {canSeeAdmin && (
          <div className={cn('border-t mx-3 pt-2 mt-2', isCollapsed && 'mx-2')}>
            {isCollapsed ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={adminUrl}
                      aria-label="Admin Portal"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Building className="h-4 w-4" />
                      <span className="sr-only">Admin Portal</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="right">Admin Portal</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <a
                href={adminUrl}
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                <Building className="h-4 w-4 shrink-0" />
                <span>Admin Portal</span>
                <ExternalLink className="ml-auto h-3 w-3 opacity-50 group-hover:opacity-100" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* User info + logout */}
      <div className="border-t p-3">
        {!isCollapsed && user && (
          <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-sm font-semibold truncate leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            <span className={cn('inline-block mt-1.5 text-[11px] px-1.5 py-0.5 rounded-full border font-semibold', ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800 border-gray-200')}>
              {user.role}
            </span>
          </div>
        )}
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full h-9 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}
