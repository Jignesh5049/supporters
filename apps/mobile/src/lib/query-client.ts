import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/errors';

/** Retries only failures that may pass on a second try: offline, 429 and 5xx. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!(error instanceof ApiError)) return false;
  return error.status === 0 || error.status === 429 || error.status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    // Mobile spec, Caching: 30 s for feeds; profile and category queries set 5 min themselves.
    queries: { staleTime: 30_000, retry: shouldRetry },
    mutations: { retry: false },
  },
});
