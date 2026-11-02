import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,             // don't refetch for 30s (rate limit friendly)
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : null;
        if (status && status < 500) return false;   // 4xx (incl. 429) won't fix itself
        return failureCount < 2;
      },
    },
  },
});