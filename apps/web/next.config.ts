import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@supporters/ui-web', '@supporters/design-tokens', '@supporters/shared'],
  poweredByHeader: false,
  // Development only: serve the API on the app's origin, as CloudFront does in production
  // (`/v1/*` goes to the API), so the first-party `__Host-` cookies work on localhost.
  async rewrites() {
    return isDev ? [{ source: '/v1/:path*', destination: `${apiInternalUrl}/v1/:path*` }] : [];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  experimental: {
    agentUpgrade: 'security',
  },
};

export default nextConfig;
