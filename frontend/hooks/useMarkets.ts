'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { PearMarket } from '@/types/trade';

export interface MarketsResponse {
  markets: PearMarket[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}

async function fetchMarkets(page: number): Promise<MarketsResponse> {
  const response = await fetch(`/api/markets?page=${page}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch markets');
  }

  return response.json();
}

export function useMarkets() {
  return useInfiniteQuery({
    queryKey: ['markets'],
    queryFn: ({ pageParam }) => fetchMarkets(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 3 * 60 * 1000,
  });
}
