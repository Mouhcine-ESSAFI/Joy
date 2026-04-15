import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationPopup } from '@/components/layout/NotificationPopup'; // ⭐ Import

// ⭐ PWA Metadata
export const metadata: Metadata = {
  title: 'Joy Morocco',
  description: 'Tour Management Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Joy Morocco',
  },
};

// ⭐ Viewport for PWA
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
        {/* PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Prevent pull-to-refresh on mobile */}
        <style dangerouslySetInnerHTML={{ __html: `
          body {
            overscroll-behavior-y: none;
            -webkit-overflow-scrolling: touch;
          }
        `}} />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            disableTransitionOnChange>
            <AuthProvider>
              {children}
               <NotificationPopup />
              <Toaster />
            </AuthProvider>
        </ThemeProvider>
      </body></html>
  );
}
