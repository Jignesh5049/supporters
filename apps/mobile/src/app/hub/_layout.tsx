import { Stack, router } from 'expo-router';
import { CenteredMessage } from '../../components/centered-message';
import { QueryState } from '../../features/catalog/components';
import { useMyBusiness } from '../../features/hub/queries';
import { colors } from '../../styles/theme';

/** Business Hub screens need a business as well as a session (mobile spec, Navigation). */
export default function HubLayout() {
  const query = useMyBusiness();

  if (query.data === undefined) {
    return (
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.data === null) {
    return (
      <CenteredMessage
        title="Create your business"
        description="Set up your business profile to list products and services and manage enquiries."
        actionLabel="Create your business"
        onAction={() => router.push('/create-business')}
      />
    );
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
