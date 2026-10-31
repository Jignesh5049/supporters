import { GuardOutcome, type ScreenRoute, guardRoute, isTabRoute, routeHref } from './routes';

describe('guardRoute', () => {
  it.each<ScreenRoute>(['home', 'discover', 'business_detail', 'product_detail'])(
    'lets a guest browse %s',
    (route) => {
      expect(guardRoute(route, false)).toBe(GuardOutcome.Allow);
    },
  );

  it.each<ScreenRoute>([
    'create',
    'messages',
    'profile',
    'notifications',
    'saved',
    'wallet',
    'withdrawal',
    'referral',
    'settings',
    'business_hub',
    'subscription',
  ])('asks a guest to sign in before %s', (route) => {
    expect(guardRoute(route, false)).toBe(GuardOutcome.SignInRequired);
  });

  it('lets a guest open the auth screens', () => {
    expect(guardRoute('sign_in', false)).toBe(GuardOutcome.Allow);
    expect(guardRoute('verify_otp', false)).toBe(GuardOutcome.Allow);
  });

  it('keeps a signed-in user out of the auth screens', () => {
    expect(guardRoute('sign_up', true)).toBe(GuardOutcome.AlreadySignedIn);
    expect(guardRoute('wallet', true)).toBe(GuardOutcome.Allow);
  });
});

describe('routeHref', () => {
  it('maps detail screens to their dynamic routes', () => {
    expect(routeHref('business_detail', { businessId: 'b-1' })).toEqual({
      pathname: '/business/[slug]',
      params: { slug: 'b-1' },
    });
    expect(routeHref('product_detail', { productId: 'p-2' })).toEqual({
      pathname: '/product/[id]',
      params: { id: 'p-2' },
    });
  });

  it('opens a conversation by id, or the inbox filtered by business', () => {
    expect(routeHref('messages', { conversationId: 'conv-1', openChat: true })).toEqual({
      pathname: '/messages/[conversationId]',
      params: { conversationId: 'conv-1' },
    });
    expect(routeHref('messages', { businessId: 'b-2' })).toEqual({
      pathname: '/messages',
      params: { businessId: 'b-2' },
    });
  });

  it('maps static screens to their paths', () => {
    expect(routeHref('home')).toBe('/');
    expect(routeHref('subscription')).toBe('/hub/premium');
    expect(routeHref('withdrawal_history')).toBe('/wallet/history');
    expect(routeHref('verify_otp')).toBe('/verify-otp');
  });

  it('switches tabs in place', () => {
    expect(isTabRoute('discover')).toBe(true);
    expect(isTabRoute('chat')).toBe(true);
    expect(isTabRoute('wallet')).toBe(false);
  });
});
