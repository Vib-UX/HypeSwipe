'use client';

import { useQuery, QueryClient } from '@tanstack/react-query';
import type { AISignal, PositionType } from '@/types/trade';

/**
 * Parameters for fetching market signals.
 */
export interface MarketSignalParams {
  marketId: string;
  assets: string[];
  change24h: string;
  openInterest: string;
  netFunding: string;
  volume: string;
  positionType: PositionType;
}

/**
 * Response type from the /api/ai/market-signal endpoint.
 */
interface MarketSignalResponse {
  signal: AISignal;
  marketId: string;
  cached: boolean;
}

/**
 * Fetch market signal from the AI endpoint.
 *
 * @param params - Market metrics for AI analysis
 * @returns AI-generated trading signal
 */
async function fetchMarketSignal(params: MarketSignalParams): Promise<AISignal> {
  const response = await fetch('/api/ai/market-signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch market signal');
  }

  const data: MarketSignalResponse = await response.json();
  return data.signal;
}

/**
 * Query key factory for market signals.
 *
 * @param marketId - The market identifier
 * @returns Query key array
 */
function getMarketSignalQueryKey(marketId: string): readonly ['market-signal', string] {
  return ['market-signal', marketId] as const;
}

/**
 * Check if all required market signal parameters are provided.
 *
 * @param params - Parameters to validate
 * @returns true if all required fields are present and valid
 */
function areParamsValid(params: Partial<MarketSignalParams> | undefined): params is MarketSignalParams {
  if (!params) {
    return false;
  }

  const { marketId, assets, change24h, openInterest, netFunding, volume, positionType } = params;

  return Boolean(
    marketId &&
    assets &&
    assets.length > 0 &&
    change24h &&
    openInterest &&
    netFunding &&
    volume &&
    positionType
  );
}

/**
 * Hook to fetch AI-generated market signals for a given market.
 *
 * Uses React Query with a 20-minute stale time to align with
 * the server-side cache TTL.
 *
 * @param params - Market metrics for AI analysis (optional)
 * @returns Query result with AI signal data
 */
export function useMarketSignal(params?: Partial<MarketSignalParams>) {
  const isEnabled = areParamsValid(params);

  return useQuery({
    queryKey: getMarketSignalQueryKey(params?.marketId ?? ''),
    queryFn: () => fetchMarketSignal(params as MarketSignalParams),
    enabled: isEnabled,
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
}

/**
 * Prefetch market signal data for upcoming cards.
 *
 * Call this function to pre-populate the cache for cards
 * that will be displayed soon (e.g., next 2-3 cards in stack).
 *
 * @param queryClient - The React Query client instance
 * @param params - Market metrics for AI analysis
 */
export async function prefetchMarketSignal(
  queryClient: QueryClient,
  params: MarketSignalParams
): Promise<void> {
  if (!areParamsValid(params)) {
    return;
  }

  await queryClient.prefetchQuery({
    queryKey: getMarketSignalQueryKey(params.marketId),
    queryFn: () => fetchMarketSignal(params),
    staleTime: 20 * 60 * 1000, // 20 minutes
  });
}
