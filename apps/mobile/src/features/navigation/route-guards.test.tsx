import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { MainTabs } from './main-tabs';
import { RootStack } from './root-stack';
import { create } from 'zustand';

// The real header and tab bar read AppContext; the guards don't depend on them.
jest.mock('../../components/Header', () => ({ Header: () => null }));
jest.mock('../../components/BottomTabBar', () => ({ BottomTabBar: () => null }));

const useTestSession = create<{ isSignedIn: boolean; isRestoring: boolean }>(() => ({
  isSignedIn: false,
  isRestoring: false,
}));
const signIn = (isSignedIn: boolean) => useTestSession.setState({ isSignedIn });

// Like AppShell: a spinner instead of the navigator while the stored session is restored.
function TestRootLayout() {
  const { isSignedIn, isRestoring } = useTestSession();
  if (isRestoring) return <Text>Restoring</Text>;
  return <RootStack isSignedIn={isSignedIn} />;
}

function TestTabsLayout() {
  const isSignedIn = useTestSession((state) => state.isSignedIn);
  return <MainTabs isSignedIn={isSignedIn} />;
}

const page = (name: string) => () => <Text>{name}</Text>;

/** The real root stack and tabs, with placeholder screens at the app's route paths. */
function renderApp(initialUrl: string) {
  return renderRouter(
    {
      _layout: { default: TestRootLayout, unstable_settings: { anchor: '(tabs)' } },
      '(tabs)/_layout': TestTabsLayout,
      '(tabs)/index': page('Home'),
      '(tabs)/discover': page('Discover'),
      '(tabs)/create': page('Create'),
      '(tabs)/messages/index': page('Inbox'),
      '(tabs)/profile': page('Profile'),
      '(auth)/_layout': () => <Stack screenOptions={{ headerShown: false }} />,
      '(auth)/sign-in': page('Sign in'),
      '(auth)/sign-up': page('Sign up'),
      'business/[slug]': page('Business'),
      'product/[id]': page('Product'),
      'messages/[conversationId]': page('Chat'),
      notifications: page('Notifications'),
      saved: page('Saved'),
      referral: page('Referral'),
      settings: page('Settings'),
      'wallet/index': page('Wallet'),
      'wallet/_layout': () => <Stack />,
      'hub/_layout': () => <Stack />,
      'hub/index': page('Hub'),
    },
    { initialUrl },
  );
}

describe('route guards', () => {
  beforeEach(() => {
    useTestSession.setState({ isSignedIn: false, isRestoring: false });
  });

  it.each([
    ['/', 'Home'],
    ['/discover', 'Discover'],
    ['/business/b-1', 'Business'],
    ['/product/p-1', 'Product'],
  ])('lets a guest open %s', async (url, name) => {
    await renderApp(url);
    expect(screen.getByText(name)).toBeVisible();
  });

  it.each(['/wallet', '/hub', '/settings', '/messages/conv-1', '/notifications', '/profile'])(
    'sends a guest from %s to sign in',
    async (url) => {
      await renderApp(url);
      expect(screen).toHavePathname('/sign-in');
    },
  );

  it.each([
    ['/wallet', 'Wallet'],
    ['/hub', 'Hub'],
    ['/messages/conv-1', 'Chat'],
    ['/profile', 'Profile'],
  ])('lets a signed-in user open %s', async (url, name) => {
    signIn(true);
    await renderApp(url);
    expect(screen.getByText(name)).toBeVisible();
  });

  it('keeps a signed-in user out of sign in', async () => {
    signIn(true);
    await renderApp('/sign-in');
    expect(screen).toHavePathname('/');
  });

  it('leaves the auth screens once the user signs in', async () => {
    await renderApp('/sign-in');
    expect(screen.getByText('Sign in')).toBeVisible();

    await act(async () => signIn(true));
    expect(screen).toHavePathname('/');
  });

  it('opens sign in when the session ends on a protected screen', async () => {
    signIn(true);
    await renderApp('/wallet');
    expect(screen.getByText('Wallet')).toBeVisible();

    await act(async () => signIn(false));
    expect(screen).toHavePathname('/sign-in');
  });

  it('keeps a deep link to a protected screen while the session restores', async () => {
    useTestSession.setState({ isRestoring: true });
    await renderApp('/wallet');
    expect(screen.getByText('Restoring')).toBeVisible();

    await act(async () => useTestSession.setState({ isRestoring: false, isSignedIn: true }));
    expect(screen.getByText('Wallet')).toBeVisible();
    expect(screen).toHavePathname('/wallet');
  });
});
