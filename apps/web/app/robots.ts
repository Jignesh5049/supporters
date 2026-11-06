import { MetadataRoute } from 'next';

/**
 * Search engine crawler rules.
 * Blocks private authenticated (app) routes, (auth) routes, and the (admin) portal.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/login',
        '/register',
        '/saved',
        '/messages',
        '/messages/*',
        '/notifications',
        '/profile',
        '/profile/*',
        '/create',
        '/wallet',
        '/referral',
        '/settings',
        '/settings/*',
        '/business/manage',
        '/business/manage/*',
        '/business/verification',
        '/business/premium',
        '/api/*',
      ],
    },
    sitemap: 'https://supporters.in/sitemap.xml',
  };
}
