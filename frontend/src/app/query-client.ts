import { MutationCache, QueryCache, QueryClient, type DefaultOptions } from '@tanstack/react-query';
import { ApiError } from '../services/api-client';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

/** Client errors (4xx) are deterministic, so only server/network failures are retried. */
const retryTransientFailures = (failureCount: number, error: unknown) =>
  !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2;

/**
 * One QueryClient per app. Any 401 from any request means the session has
 * expired or was revoked, so the cached user is cleared and the UI falls back
 * to the signed-out state instead of showing stale "signed in" controls.
 */
export function createQueryClient(overrides: DefaultOptions = {}): QueryClient {
  const onError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: retryTransientFailures, ...overrides.queries },
      mutations: { retry: false, ...overrides.mutations },
    },
  });
  return queryClient;
}
