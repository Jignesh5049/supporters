import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Routes that open from shared links and push taps (mobile spec, Deep links). */
const APP_LINK_PATHS = ['/business', '/product', '/service', '/post', '/messages', '/requirements'];

// TODO(mobile): set APP_LINK_DOMAIN in each EAS build profile once the domain is registered, and
// serve /.well-known/assetlinks.json and apple-app-site-association from it. Until then only the
// supporters:// scheme opens the app.
const appLinkDomain = process.env.APP_LINK_DOMAIN;

export default ({ config }: ConfigContext): ExpoConfig => {
  const expoConfig: ExpoConfig = {
    ...config,
    name: config.name ?? 'Supporters',
    slug: config.slug ?? 'supporters',
  };
  if (!appLinkDomain) return expoConfig;

  return {
    ...expoConfig,
    ios: { ...expoConfig.ios, associatedDomains: [`applinks:${appLinkDomain}`] },
    android: {
      ...expoConfig.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: APP_LINK_PATHS.map((pathPrefix) => ({
            scheme: 'https',
            host: appLinkDomain,
            pathPrefix,
          })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
