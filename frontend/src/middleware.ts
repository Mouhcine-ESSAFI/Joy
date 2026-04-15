import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/_next',
  '/api',
  '/favicon',
  '/icon',
  '/manifest.json',
  '/sw.js',
  '/workbox-',
  '/robots.txt',
  '/sitemap.xml',
];

// Routes that belong exclusively to each portal
const ADMIN_ROUTES = ['/admin', '/customers'];
const BOOKING_ROUTES = ['/dashboard', '/orders', '/calendar'];

const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || 'one.joymorocco';
const BOOKING_HOST = process.env.NEXT_PUBLIC_BOOKING_HOST || 'booking.joymorocco';

function getPortal(hostname: string): 'admin' | 'booking' | 'all' {
  if (hostname === ADMIN_HOST || hostname.startsWith('one.')) return 'admin';
  if (hostname === BOOKING_HOST || hostname.startsWith('booking.')) return 'booking';
  return 'all'; // localhost / unknown → allow everything
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host')?.split(':')[0] ?? '';

  // Always allow public paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Auth check
  const accessToken = request.cookies.get('access_token');
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const portal = getPortal(hostname);

  // On admin subdomain: redirect booking routes → booking subdomain
  if (portal === 'admin') {
    const isBookingRoute = BOOKING_ROUTES.some((r) => pathname.startsWith(r));
    if (isBookingRoute) {
      const target = new URL(request.url);
      target.host = BOOKING_HOST;
      return NextResponse.redirect(target);
    }
  }

  // On booking subdomain: redirect admin routes → admin subdomain
  if (portal === 'booking') {
    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    if (isAdminRoute) {
      const target = new URL(request.url);
      target.host = ADMIN_HOST;
      return NextResponse.redirect(target);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$|.*\\.svg$|.*\\.webp$).*)',
  ],
};
