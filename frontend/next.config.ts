import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  reloadOnOnline: false,
  // swSrc triggers Workbox's InjectManifest plugin. All runtime caching and
  // push notification handlers live in src/sw.ts — do NOT add
  // workboxOptions.runtimeCaching here, that is a GenerateSW-only option and
  // will cause next-pwa to regenerate the SW from scratch, wiping push handlers.
  swSrc: 'src/sw.js',
  swDest: 'public/sw.js',
  // skipWaiting is called inside sw.ts (self.skipWaiting()). Passing it here
  // too would trigger a double-activation race — leave it out.
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/:path*`
          : 'http://localhost:3100/:path*',
      },
    ];
  },
};

export default withPWA(nextConfig);