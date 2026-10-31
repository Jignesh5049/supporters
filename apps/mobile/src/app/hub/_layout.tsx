import { Stack } from 'expo-router';
import { CenteredMessage } from '../../components/centered-message';
import { useApp } from '../../context/AppContext';
import { colors } from '../../styles/theme';

/** Business Hub screens need a business as well as a session (mobile spec, Navigation). */
export default function HubLayout() {
  const { userBusiness, navigate } = useApp();

  if (!userBusiness) {
    return (
      <CenteredMessage
        title="Create your business"
        description="Set up your business profile to list products and services and manage enquiries."
        actionLabel="Back to profile"
        onAction={() => navigate('profile')}
      />
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
