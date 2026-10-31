import { router } from 'expo-router';
import { CenteredMessage } from '../components/centered-message';

export default function NotFoundScreen() {
  return (
    <CenteredMessage
      title="Page not found"
      description="This link doesn't open anything in Supporters."
      actionLabel="Go to Home"
      onAction={() => router.replace('/')}
    />
  );
}
