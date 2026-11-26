import { MetadataRoute } from 'next';

/**
 * Static pages only for now. Business, product and service URLs join once the
 * API has a paginated public index to build them from (web spec, SEO: sitemap
 * split by type); listing them from mock data would point crawlers at 404s.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://supporters.in';

  return [
    '',
    '/discover',
    '/saved',
    '/messages',
    '/notifications',
    '/profile',
    '/create',
    '/referral',
    '/settings',
    '/help',
    '/about',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/community-guidelines',
    '/login',
    '/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));
}
