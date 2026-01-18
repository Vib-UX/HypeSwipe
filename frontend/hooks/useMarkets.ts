'use client';

import { useQuery } from '@tanstack/react-query';
import type { PearMarket } from '@/types/trade';

/**
 * Response type from the /api/markets endpoint
 */
interface MarketsResponse {
  markets: PearMarket[];
  cached: boolean;
  timestamp: string;
}

/**
 * Fetch markets data from the API
 */
async function fetchMarkets(): Promise<MarketsResponse> {
  const response = await fetch('/api/markets');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch markets');
  }

  return response.json();
}

/**
 * Hook to fetch Pear Protocol markets data
 *
 * Uses React Query with a 3-minute stale time to align with
 * the server-side cache TTL.
 */
export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarkets,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
