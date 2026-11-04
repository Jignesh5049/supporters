import type { ScreenRoute } from '../../context/AppContext';

type RouteParams = Record<string, unknown> | undefined;

/** Bottom tab roots: switching to one should not stack another copy of it. */
export const TAB_ROUTES: readonly ScreenRoute[] = [
  'home',
  'discover',
  'create',
  'messages',
  'profile',
];

const STATIC_PATHS: Partial<Record<ScreenRoute, string>> = {
  home: '/',
  discover: '/discover',
  create: '/create',
  messages: '/messages',
  profile: '/profile',
  notifications: '/notifications',
  saved: '/saved',
  referral: '/referral',
  subscription: '/hub/premium',
  settings: '/settings',
  wallet: '/wallet',
  withdrawal: '/wallet/withdraw',
  withdrawal_history: '/wallet/history',
  business_hub: '/hub',
  business_edit: '/hub/edit',
  business_posts: '/hub/posts',
  business_settings: '/hub/settings',
  sign_in: '/sign-in',
  sign_up: '/sign-up',
  verify_otp: '/verify-otp',
  forgot_password: '/forgot-password',
};

/** Path segments come from data (slugs, ids): encode them so they can't change the path. */
function segment(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? encodeURIComponent(value) : null;
}

/**
 * The Expo Router path for a prototype screen name. Screens with an id need it in
 * `params`; without one they fall back to null and the caller stays put.
 */
export function hrefForRoute(route: ScreenRoute, params?: RouteParams): string | null {
  switch (route) {
    case 'business_detail': {
      const slug = segment(params?.slug ?? params?.businessId);
      return slug ? `/business/${slug}` : null;
    }
    case 'product_detail': {
      const id = segment(params?.productId);
      return id ? `/product/${id}` : null;
    }
    case 'service_detail': {
      const id = segment(params?.serviceId);
      return id ? `/service/${id}` : null;
    }
    case 'chat': {
      const id = segment(params?.conversationId);
      return id ? `/messages/${id}` : '/messages';
    }
    default:
      return STATIC_PATHS[route] ?? null;
  }
}

/** The prototype screen name for a path, so the header and tab bar can highlight it. */
export function routeForPath(pathname: string): ScreenRoute | null {
  if (pathname.startsWith('/business/')) return 'business_detail';
  if (pathname.startsWith('/product/')) return 'product_detail';
  if (pathname.startsWith('/service/')) return 'service_detail';
  if (pathname.startsWith('/messages/')) return 'chat';
  for (const [route, path] of Object.entries(STATIC_PATHS)) {
    if (path === pathname) return route as ScreenRoute;
  }
  return null;
}
