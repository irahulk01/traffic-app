import { useQuery } from '@tanstack/react-query';
import { getCityTrafficData } from '../data/trafficEngine';

/**
 * Custom TanStack Query hook for fetching city traffic telemetry.
 *
 * getCityTrafficData is a pure local function (no network calls) with its own
 * 10-minute in-memory + localStorage cache. There is no external data source
 * to poll, so refetchInterval is intentionally omitted.
 *
 * The Google Maps TrafficLayer handles live visual traffic independently
 * with its own autoRefresh mechanism.
 *
 * Manual refresh via the header button calls refetch() directly.
 */
export function useCityTraffic(city) {
  const cityName = city?.name || '';

  return useQuery({
    queryKey: ['cityTraffic', cityName],
    queryFn: async () => {
      if (!city) return null;
      return getCityTrafficData(city, false);
    },
    enabled: Boolean(city && city.name),
    staleTime: 10 * 60 * 1000, // 10-minute cache freshness window
    // No refetchInterval — this is a local compute function, not a network API
  });
}

export default useCityTraffic;
