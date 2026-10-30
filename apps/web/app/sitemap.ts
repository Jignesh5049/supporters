import { MetadataRoute } from 'next';
import { MOCK_PRODUCTS, MOCK_SERVICES, MOCK_BUSINESSES } from '@/lib/mock-data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://supporters.in';

  const staticRoutes = [
    '',
    '/discover',
    '/saved',
    '/messages',
    '/notifications',
    '/profile',
    '/create',
    '/referral',
    '/subscription',
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

  const productRoutes = MOCK_PRODUCTS.map((p) => ({
    url: `${baseUrl}/product/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const serviceRoutes = MOCK_SERVICES.map((s) => ({
    url: `${baseUrl}/service/${s.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const businessRoutes = MOCK_BUSINESSES.map((b) => ({
    url: `${baseUrl}/business/${b.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes, ...serviceRoutes, ...businessRoutes];
}
