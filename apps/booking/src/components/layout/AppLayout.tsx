'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuthContext } from '@/context/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuthContext();

  const [isSidebarOpenStored, setIsSidebarOpenStored] = useLocalStorage('sidebar-open', true);
  const isMobile = useIsMobile();

  const isSidebarOpen = useMemo(() => {
    if (isMobile) return false; // Sidebar is a sheet on mobile, never fixed-open
    return isSidebarOpenStored;
  }, [isMobile, isSidebarOpenStored]);
  
  const isSidebarCollapsed = !isSidebarOpen;

  useEffect(() => {
    if (loading) return; // Wait until auth state is confirmed

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
    
    if (isAuthenticated && pathname === '/login') {
    router.replace('/orders');
    }
  }, [pathname, isAuthenticated, loading, router]);

  const toggleSidebar = () => {
    if (!isMobile) {
      setIsSidebarOpenStored(prev => !prev);
    }
  };

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
     return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // or a loader, to prevent flicker before redirect
  }

  return (
    <div className="min-h-screen w-full">
      {/* Sidebar - fixed on desktop */}
      <div className={cn(
        "hidden md:block fixed inset-y-0 left-0 z-10 w-[280px] border-r bg-muted/40 transition-all duration-300 ease-in-out",
        isSidebarCollapsed && "w-[72px]"
      )}>
        <AppSidebar isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Main content - header and page content */}
      <div className={cn(
        "flex flex-col transition-all duration-300 ease-in-out",
        "md:ml-[280px]", // margin for open sidebar
        isSidebarCollapsed && "md:ml-[72px]" // margin for collapsed sidebar
      )}>
        <AppHeader onToggleSidebar={toggleSidebar} isSidebarCollapsed={isSidebarCollapsed} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
