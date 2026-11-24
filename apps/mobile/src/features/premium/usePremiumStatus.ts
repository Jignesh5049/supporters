import { useQuery } from '@tanstack/react-query';
import { premiumApi } from '../../lib/api';

export const premiumKeys = { status: ['premium', 'status'] as const };

/** Status only. The app never starts, changes or cancels a subscription. */
export function usePremiumStatus() {
  return useQuery({
    queryKey: premiumKeys.status,
    queryFn: () => premiumApi.getStatus(),
    staleTime: 60_000,
  });
}
