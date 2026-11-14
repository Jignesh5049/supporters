import type { NextConfig } from 'next';
import { securityHeaders } from './lib/security/headers';

const isDev = process.env.NODE_ENV === 'development';
// Development, or a local production build (E2E_PROD builds with LOCAL_API_PROXY=1): serve the API on
// the app's origin. Real deployments never set it: CloudFront routes `/v1/*` to the API.
const proxyApi = isDev || process.env.LOCAL_API_PROXY === '1';
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@supporters/ui-web', '@supporters/design-tokens', '@supporters/shared'],
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    // The CSP (needs a per-request nonce) is set in proxy.ts; these do not vary per request.
    return [{ source: '/:path*', headers: [...securityHeaders(!isDev)] }];
  },
  // Development only: serve the API on the app's origin, as CloudFront does in production
  // (`/v1/*` goes to the API), so the first-party `__Host-` cookies work on localhost.
  async rewrites() {
    return proxyApi
      ? [
          // Socket.IO only answers on `/v1/ws/` (with the slash), which the catch-all drops.
          { source: '/v1/ws/', destination: `${apiInternalUrl}/v1/ws/` },
          { source: '/v1/:path*', destination: `${apiInternalUrl}/v1/:path*` },
        ]
      : [];
  },
  // Development only, for the chat socket above: Next would 308 `/v1/ws/` to `/v1/ws` before
  // any rewrite runs. In production `/v1/*` never reaches Next, so the default stays.
  skipTrailingSlashRedirect: proxyApi,
  // Cache Components and Partial Prefetching stay off: a prerendered static shell has no request,
  // so its scripts could not carry the CSP nonce (Next docs, Content Security Policy).
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
