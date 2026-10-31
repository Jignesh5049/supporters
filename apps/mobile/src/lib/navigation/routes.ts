import type { Href } from 'expo-router';

/** The prototype's screen names, kept so screens can still call `navigate('wallet')`. */
export type ScreenRoute =
  | 'home'
  | 'discover'
  | 'messages'
  | 'chat'
  | 'profile'
  | 'create'
  | 'notifications'
  | 'saved'
  | 'referral'
  | 'subscription'
  | 'settings'
  | 'business_detail'
  | 'product_detail'
  | 'wallet'
  | 'withdrawal'
  | 'withdrawal_history'
  | 'business_hub'
  | 'business_edit'
  | 'business_posts'
  | 'business_settings'
  | 'sign_in'
  | 'sign_up'
  | 'verify_otp'
  | 'forgot_password';

/** Params screens pass today. Anything secret (passwords, OTPs) goes in the auth-flow store. */
export interface RouteParams {
  businessId?: string;
  productId?: string;
  conversationId?: string;
  initialTab?: string;
  openRequirement?: boolean;
  openChat?: boolean;
}

export const AUTH_ROUTES: readonly ScreenRoute[] = [
  'sign_in',
  'sign_up',
  'verify_otp',
  'forgot_password',
];

/** Screens a guest (no session) can browse; the rest ask them to sign in. */
export const GUEST_ROUTES: readonly ScreenRoute[] = [
  'home',
  'discover',
  'business_detail',
  'product_detail',
];

/** Bottom tabs switch in place instead of stacking a new screen. */
const TAB_ROUTES: readonly ScreenRoute[] = ['home', 'discover', 'create', 'messages', 'profile'];

export function isTabRoute(route: ScreenRoute): boolean {
  return TAB_ROUTES.includes(route) || route === 'chat';
}

const STATIC_PATHS = {
  home: '/',
  discover: '/discover',
  create: '/create',
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
} as const;

/** Maps a prototype screen name and its params to an Expo Router href. */
export function routeHref(route: ScreenRoute, params: RouteParams = {}): Href {
  switch (route) {
    case 'home':
      return params.openRequirement ? { pathname: '/', params: { openRequirement: '1' } } : '/';
    case 'create':
      return params.initialTab
        ? { pathname: '/create', params: { initialTab: params.initialTab } }
        : '/create';
    case 'messages':
    case 'chat':
      if (params.conversationId) {
        return {
          pathname: '/messages/[conversationId]',
          params: { conversationId: params.conversationId },
        };
      }
      return params.businessId
        ? { pathname: '/messages', params: { businessId: params.businessId } }
        : '/messages';
    case 'business_detail':
      return { pathname: '/business/[slug]', params: { slug: params.businessId ?? '' } };
    case 'product_detail':
      return { pathname: '/product/[id]', params: { id: params.productId ?? '' } };
    default:
      return STATIC_PATHS[route];
  }
}

export const GuardOutcome = {
  Allow: 'allow',
  SignInRequired: 'signInRequired',
  AlreadySignedIn: 'alreadySignedIn',
} as const;
export type GuardOutcome = (typeof GuardOutcome)[keyof typeof GuardOutcome];

/** Who may open a screen: guests browse, personal screens need a session, auth screens need none. */
export function guardRoute(route: ScreenRoute, isSignedIn: boolean): GuardOutcome {
  const isAuthRoute = AUTH_ROUTES.includes(route);
  if (isSignedIn) return isAuthRoute ? GuardOutcome.AlreadySignedIn : GuardOutcome.Allow;
  if (isAuthRoute || GUEST_ROUTES.includes(route)) return GuardOutcome.Allow;
  return GuardOutcome.SignInRequired;
}

/**
 * Root stack routes that need a session. A guest who deep-links to one lands on the anchor
 * (Home); in-app taps go through `guardRoute` and open sign-in instead.
 */
export const PROTECTED_STACK_ROUTES = [
  'messages/[conversationId]',
  'notifications',
  'saved',
  'referral',
  'settings',
  'wallet',
  'hub',
] as const;

/** Tabs a guest can't open: tapping them opens sign-in. */
export const PROTECTED_TAB_ROUTES = ['create', 'messages/index', 'profile'] as const;
