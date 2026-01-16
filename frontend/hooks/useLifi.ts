'use client';

import { useMutation } from '@tanstack/react-query';
import type { LifiQuoteRequest, LifiQuoteResponse } from '@/types';

/**
 * Fetch BTC to USDC quote from Li.Fi
 */
async function fetchBtcToUsdcQuote(data: LifiQuoteRequest): Promise<LifiQuoteResponse> {
  const response = await fetch('/api/lifi/quote-btc-to-usdc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'Failed to fetch quote');
  }
  
  return response.json();
}

/**
 * Hook to fetch BTC → USDC quote
 */
export function useBtcToUsdcQuote() {
  return useMutation({
    mutationFn: fetchBtcToUsdcQuote,
  });
}
