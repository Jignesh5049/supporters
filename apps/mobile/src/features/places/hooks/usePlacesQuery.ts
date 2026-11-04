import { useQuery } from '@tanstack/react-query';
import { placesApi } from '../../../lib/api';

export const placeKeys = {
  all: ['places'] as const,
  states: () => [...placeKeys.all, 'states'] as const,
  cities: (stateCode: string) => [...placeKeys.all, 'cities', stateCode] as const,
};

/** Reference data: the API caches it for an hour, so the app keeps it as long. */
export function useStates() {
  return useQuery({
    queryKey: placeKeys.states(),
    queryFn: () => placesApi.states(),
    staleTime: 60 * 60_000,
  });
}

export function useCities(stateCode: string | null) {
  return useQuery({
    queryKey: placeKeys.cities(stateCode ?? ''),
    queryFn: () => placesApi.cities(stateCode ?? ''),
    enabled: Boolean(stateCode),
    staleTime: 60 * 60_000,
  });
}
