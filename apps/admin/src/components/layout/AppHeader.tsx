'use client';

import { Menu, Sun, Moon, Laptop, PanelLeftOpen, PanelLeftClose, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from 'next-themes';
import AppSidebar from './AppSidebar';
import { NotificationCenter } from './NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { InstallAppButton } from './InstallAppButton';

export default function AppHeader({ onToggleSidebar, isSidebarCollapsed }: { onToggleSidebar: () => void, isSidebarCollapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthContext();
  
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-muted/40 px-4 sm:px-6">
      {/* Mobile Menu & Desktop Toggle */}
      <div className="flex items-center gap-2">
        <Sheet>
            <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
            </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
            <AppSidebar isCollapsed={false} />
            </SheetContent>
        </Sheet>

        <Button
            variant="outline"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden shrink-0 md:flex"
        >
            {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
            ) : (
                <PanelLeftClose className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex w-full items-center justify-end gap-2 md:gap-4">
        <InstallAppButton />
        <NotificationCenter />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {user?.role && (
                  <span className="mt-1 inline-block text-[10px] font-medium text-muted-foreground border rounded px-1.5 py-0.5 w-fit">
                    {user.role}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : theme === 'light' ? <Sun className="mr-2 h-4 w-4" /> : <Laptop className="mr-2 h-4 w-4" />}
                    <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme('light')}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                            {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                            {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('system')}>
                            <Laptop className="mr-2 h-4 w-4" />
                            <span>System</span>
                            {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <div className="sm:hidden">
              <InstallAppButton menuItem />
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
