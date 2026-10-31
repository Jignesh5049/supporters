import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/BottomTabBar';
import { PROTECTED_TAB_ROUTES } from '../../lib/navigation/routes';
import { colors } from '../../styles/theme';

interface MainTabsProps {
  isSignedIn: boolean;
}

/** Home, Discover, Create, Messages and Profile. Guests get Home and Discover. */
export function MainTabs({ isSignedIn }: MainTabsProps) {
  return (
    <Tabs
      tabBar={() => <BottomTabBar />}
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="discover" />
      <Tabs.Protected guard={isSignedIn} redirectTo="/sign-in">
        {PROTECTED_TAB_ROUTES.map((name) => (
          <Tabs.Screen key={name} name={name} />
        ))}
      </Tabs.Protected>
    </Tabs>
  );
}
