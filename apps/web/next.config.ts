import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

const isDev = process.env.NODE_ENV === 'development';
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@supporters/ui-web', '@supporters/design-tokens', '@supporters/shared'],
  poweredByHeader: false,
  // Development only: serve the API on the app's origin, as CloudFront does in production
  // (`/v1/*` goes to the API), so the first-party `__Host-` cookies work on localhost.
  async rewrites() {
    return isDev ? [{ source: '/v1/:path*', destination: `${apiInternalUrl}/v1/:path*` }] : [];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.supporters.in',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(isDev
        ? [
            {
              protocol: 'http' as const,
              hostname: '127.0.0.1',
            },
            {
              protocol: 'http' as const,
              hostname: 'localhost',
            },
          ]
        : []),
    ],
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  experimental: {
    taint: true,
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
});
