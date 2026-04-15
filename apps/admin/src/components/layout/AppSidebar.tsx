'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users, Map, Building, KeyRound, FileCog, Contact, LogOut,
  ChevronDown, Settings, Shield, Briefcase, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Logo } from './Logo';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthContext } from '@/context/AuthContext';
import type { UserRole } from '@/lib/types';
import { useMemo } from 'react';

const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST || 'booking.joymorocco';

const ROLE_COLORS: Record<string, string> = {
  Owner: 'bg-amber-100 text-amber-800 border-amber-200',
  Admin: 'bg-blue-100 text-blue-800 border-blue-200',
  'Travel Agent': 'bg-green-100 text-green-800 border-green-200',
  Finance: 'bg-purple-100 text-purple-800 border-purple-200',
  Driver: 'bg-gray-100 text-gray-800 border-gray-200',
};

const nav = [
  { href: '/admin/users', icon: Users, label: 'User Management', roles: ['Owner', 'Admin'] },
  { href: '/customers', icon: Contact, label: 'Customers', roles: ['Owner', 'Admin'] },
  { href: '/admin/tour-mapping', icon: Map, label: 'Tour Mapping', roles: ['Owner', 'Admin'] },
  { href: '/admin/integrations', icon: Building, label: 'Integrations', roles: ['Owner'] },
  { href: '/admin/profile', icon: Shield, label: 'Owner Profile', roles: ['Owner'] },
  {
    label: 'Settings',
    icon: Settings,
    roles: ['Owner', 'Admin'],
    subItems: [
      { href: '/admin/settings/room-rules', icon: KeyRound, label: 'Room Type Rules' },
      { href: '/admin/settings/transport', icon: FileCog, label: 'Transport Types' },
    ],
  },
] as const;

export default function AppSidebar({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  const role = user?.role as UserRole | undefined;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getIsActive = (href: string) => pathname.startsWith(href);
  const isSettingsActive = ['/admin/settings/room-rules', '/admin/settings/transport'].some(getIsActive);

  const visibleNav = useMemo(() => {
    if (!role) return [];
    return nav.filter((item) => (item.roles as readonly string[]).includes(role));
  }, [role]);

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${BOOKING_HOST}/orders`
    : `https://${BOOKING_HOST}/orders`;

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const isActive = getIsActive(href);
    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Link
        href={href}
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          isActive
            ? 'bg-primary/10 text-primary border-l-2 border-primary pl-[10px]'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent pl-[10px]',
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex h-full max-h-screen flex-col bg-card">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4 lg:px-6">
        <Link href="/admin/users" className="flex items-center gap-2 font-bold text-primary">
          <Logo className="h-6 w-6" />
          <span className={cn('text-base tracking-tight', isCollapsed && 'sr-only')}>Joy Admin</span>
        </Link>
        {!isCollapsed && (
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground border rounded-full px-2 py-0.5 bg-muted">
            ADMIN
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className={cn('grid items-start gap-y-0.5', isCollapsed ? 'px-2 py-2' : 'px-3 py-2')}>
          {visibleNav.map((item) => {
            if (!('subItems' in item)) {
              return <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />;
            }

            // Settings collapsible
            if (isCollapsed) {
              return (
                <TooltipProvider key="settings" delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/admin/settings/room-rules"
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                          isSettingsActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            }

            return (
              <Collapsible key="settings" className="w-full" defaultOpen={isSettingsActive}>
                <CollapsibleTrigger className="w-full group [&[data-state=open]>div>svg.chevron]:rotate-180">
                  <div className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all border-l-2 border-transparent pl-[10px]',
                    isSettingsActive ? 'text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    Settings
                    <ChevronDown className="chevron ml-auto h-4 w-4 transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 pl-3 border-l border-border mt-1 grid gap-0.5 mb-1">
                    {item.subItems.map((sub) => {
                      const isSubActive = getIsActive(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-all',
                            isSubActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )}
                        >
                          <sub.icon className="h-3.5 w-3.5 shrink-0" />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>

        {/* Booking portal cross-link */}
        <div className={cn('border-t mx-3 pt-2 mt-2', isCollapsed && 'mx-2')}>
          {isCollapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={bookingUrl}
                    aria-label="Booking Portal"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="sr-only">Booking Portal</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">Booking Portal</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <a
              href={bookingUrl}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              <span>Booking Portal</span>
              <ExternalLink className="ml-auto h-3 w-3 opacity-50 group-hover:opacity-100" />
            </a>
          )}
        </div>
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
