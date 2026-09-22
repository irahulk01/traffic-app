import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,     // 10-minute cache freshness
      gcTime: 30 * 60 * 1000,         // Keep in memory for 30 minutes
      // No global refetchInterval — only opt in per-query when there is a real
      // network data source to poll. Local compute functions don't need it.
      refetchOnWindowFocus: false,     // Prevent unwanted re-fetches on tab switch
      retry: 1,
    },
  },
});

export default queryClient;
