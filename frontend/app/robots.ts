import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/business/manage/', '/settings/'],
    },
    sitemap: 'https://supporters.in/sitemap.xml',
  };
}
