'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  ChevronDown,
  Home,
  LogOut,
  Map,
  Settings,
  Users,
  Building,
  KeyRound,
  FileCog,
  Contact,
  PlusCircle,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useMemo } from 'react';
import { Logo } from './Logo';
import type { User as AppUser, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthContext } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';

const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || 'one.joymorocco';
const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST || 'booking.joymorocco';

function usePortal(): 'admin' | 'booking' | 'all' {
  if (typeof window === 'undefined') return 'all';
  const host = window.location.hostname;
  if (host === ADMIN_HOST || host.startsWith('one.')) return 'admin';
  if (host === BOOKING_HOST || host.startsWith('booking.')) return 'booking';
  return 'all';
}

const bookingNav = [
  { href: '/orders', icon: Briefcase, label: 'Orders' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
];

const adminNav = [
  { href: '/admin/users', icon: Users, label: 'User Management', roles: ['Owner' as UserRole, 'Admin' as UserRole] },
  { href: '/customers', icon: Contact, label: 'Customers', roles: ['Owner' as UserRole, 'Admin' as UserRole] },
  { href: '/admin/tour-mapping', icon: Map, label: 'Tour Mapping', roles: ['Owner' as UserRole, 'Admin' as UserRole] },
  { href: '/admin/integrations', icon: Building, label: 'Integrations', roles: ['Owner' as UserRole] },
  { href: '/admin/profile', icon: Shield, label: 'Owner Profile', roles: ['Owner' as UserRole] },
  {
    label: 'Settings',
    icon: Settings,
    roles: ['Owner' as UserRole, 'Admin' as UserRole],
    subItems: [
      { href: '/admin/settings/room-rules', icon: KeyRound, label: 'Room Type Rules', roles: ['Owner' as UserRole, 'Admin' as UserRole] },
      { href: '/admin/settings/transport', icon: FileCog, label: 'Transport Types', roles: ['Owner' as UserRole, 'Admin' as UserRole] },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  Owner: 'bg-amber-100 text-amber-800',
  Admin: 'bg-blue-100 text-blue-800',
  'Travel Agent': 'bg-green-100 text-green-800',
  Finance: 'bg-purple-100 text-purple-800',
  Driver: 'bg-gray-100 text-gray-800',
};

export default function AppSidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const userRole = user?.role;
  const portal = usePortal();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getIsActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  const visibleAdminNav = useMemo(() => {
    if (!userRole) return [];
    return adminNav
      .filter((item) => item.roles.includes(userRole))
      .map((item) => ({
        ...item,
        subItems: item.subItems?.filter((sub) => sub.roles.includes(userRole)),
      }))
      .filter((item) => !item.subItems || item.subItems.length > 0);
  }, [userRole]);

  const isSettingsActive = useMemo(
    () => adminNav.find((i) => i.label === 'Settings')?.subItems?.some((s) => getIsActive(s.href)) ?? false,
    [pathname],
  );

  const showBooking = portal === 'all' || portal === 'booking';
  const showAdmin = (portal === 'all' || portal === 'admin') && (userRole === 'Admin' || userRole === 'Owner');

  // Cross-portal link helper
  function crossLink(path: string) {
    if (portal === 'all') return path;
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
    const isAdminPath = ['/admin', '/customers'].some((r) => path.startsWith(r));
    const host = isAdminPath ? ADMIN_HOST : BOOKING_HOST;
    return `${protocol}//${host}${path}`;
  }

  const NavLink = ({ item, isActive }: { item: { href: string; icon: React.ElementType; label: string }; isActive: boolean }) => {
    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={item.href} className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8', isActive && 'bg-accent text-accent-foreground')}>
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Link href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary', isActive && 'bg-muted text-primary')}>
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  const portalLabel = portal === 'admin' ? 'Admin Portal' : portal === 'booking' ? 'Booking Portal' : null;

  return (
    <div className="flex h-full max-h-screen flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Logo className="h-6 w-6" />
          <span className={cn(isCollapsed && 'sr-only')}>Joy Platform</span>
        </Link>
        {portalLabel && !isCollapsed && (
          <span className="ml-auto text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5">
            {portalLabel}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <nav className={cn('grid items-start gap-y-4 py-4 text-sm font-medium', isCollapsed ? 'px-2' : 'px-4')}>
          {/* Dashboard — always visible */}
          <div className="grid gap-1">
            <NavLink item={{ href: '/dashboard', icon: Home, label: 'Dashboard' }} isActive={getIsActive('/dashboard')} />
          </div>

          {/* Booking section */}
          {showBooking && (
            <div className="grid gap-1">
              <h3 className={cn('px-3 text-xs font-semibold uppercase text-muted-foreground', isCollapsed && 'sr-only')}>Booking</h3>
              {bookingNav.map((item) => (
                <NavLink key={item.href} item={item} isActive={getIsActive(item.href)} />
              ))}
              {/* Quick New Order button */}
              {!isCollapsed && (
                <Link
                  href="/orders/new"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary mt-1"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Order
                </Link>
              )}
            </div>
          )}

          {/* Admin section */}
          {showAdmin && (
            <div className="grid gap-1">
              <h3 className={cn('px-3 text-xs font-semibold uppercase text-muted-foreground', isCollapsed && 'sr-only')}>Admin</h3>
              {visibleAdminNav.map((item) =>
                !item.subItems ? (
                  <NavLink key={item.href!} item={item as any} isActive={getIsActive(item.href!)} />
                ) : isCollapsed ? (
                  <TooltipProvider key={item.label} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href="/admin/settings/room-rules" className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8', isSettingsActive && 'bg-accent text-accent-foreground')}>
                          <item.icon className="h-5 w-5" />
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Collapsible key={item.label} className="w-full grid" defaultOpen={isSettingsActive}>
                    <CollapsibleTrigger className="w-full [&[data-state=open]>div>svg.chevron]:rotate-180">
                      <div className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary', isSettingsActive && 'text-primary')}>
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <ChevronDown className="chevron ml-auto h-4 w-4 transition-transform" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid items-start pl-7 text-sm font-medium mt-1">
                        {item.subItems!.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary', getIsActive(subItem.href) && 'bg-muted text-primary')}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ),
              )}
            </div>
          )}

          {/* Cross-portal links */}
          {(portal === 'booking' || portal === 'all') && (userRole === 'Admin' || userRole === 'Owner') && (
            <div className={cn('grid gap-1 border-t pt-4', isCollapsed ? '' : '')}>
              {isCollapsed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={crossLink('/admin/users')} aria-label="Admin Portal" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                        <Building className="h-5 w-5" />
                        <span className="sr-only">Admin Portal</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="right">Admin Portal (one.joymorocco)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <a href={crossLink('/admin/users')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-xs">
                  <Building className="h-4 w-4" />
                  <span>Admin Portal</span>
                  <span className="ml-auto text-[10px] opacity-60">one.joymorocco</span>
                </a>
              )}
            </div>
          )}
          {(portal === 'admin' || portal === 'all') && (
            <div className={cn('grid gap-1', (portal === 'booking' || portal === 'all') && (userRole === 'Admin' || userRole === 'Owner') ? '' : 'border-t pt-4')}>
              {isCollapsed ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={crossLink('/orders')} aria-label="Booking Portal" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                        <Briefcase className="h-5 w-5" />
                        <span className="sr-only">Booking Portal</span>
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="right">Booking Portal (booking.joymorocco)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <a href={crossLink('/orders')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-xs">
                  <Briefcase className="h-4 w-4" />
                  <span>Booking Portal</span>
                  <span className="ml-auto text-[10px] opacity-60">booking.joymorocco</span>
                </a>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* User info + logout */}
      <div className="mt-auto border-t p-4">
        {!isCollapsed && user && (
          <div className="mb-3 px-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <span className={cn('inline-block mt-1 text-xs px-1.5 py-0.5 rounded font-medium', ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-800')}>
              {user.role}
            </span>
          </div>
        )}
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  <span className="sr-only">Logout</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}
