import { Stack } from 'expo-router';
import { Header } from '../../components/Header';
import { PROTECTED_STACK_ROUTES } from '../../lib/navigation/routes';
import { colors } from '../../styles/theme';

interface RootStackProps {
  isSignedIn: boolean;
}

/**
 * The root navigator. Guests can open the tabs, auth screens and catalog pages. Personal screens
 * stay out of the stack until there is a session, so a deep link to one opens sign-in instead.
 */
export function RootStack({ isSignedIn }: RootStackProps) {
  return (
    <Stack
      screenOptions={{
        header: () => <Header />,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn} redirectTo="/sign-in">
        {PROTECTED_STACK_ROUTES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}
