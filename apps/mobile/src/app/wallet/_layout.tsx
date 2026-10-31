import { Stack } from 'expo-router';
import { colors } from '../../styles/theme';

export default function WalletLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
