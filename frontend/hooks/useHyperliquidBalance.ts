'use client';

import { useQuery } from '@tanstack/react-query';

// Hyperliquid API endpoint
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// USDC token index on Hyperliquid (index 0 is USDC)
const USDC_TOKEN_INDEX = 0;

interface SpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
}

interface SpotClearinghouseState {
  balances: SpotBalance[];
}

interface PerpsBalance {
  accountValue: string;
  marginSummary: {
    accountValue: string;
    totalMarginUsed: string;
    totalNtlPos: string;
    totalRawUsd: string;
  };
  withdrawable: string;
}

export interface HyperliquidBalance {
  spotUsdc: number;
  perpsAccountValue: number;
  perpsWithdrawable: number;
  totalUsdc: number;
}

async function fetchSpotBalance(address: string): Promise<SpotClearinghouseState | null> {
  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'spotClearinghouseState',
        user: address,
      }),
    });

    if (!response.ok) {
      console.error('[Hyperliquid] Spot balance fetch failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Hyperliquid] Spot balance error:', error);
    return null;
  }
}

async function fetchPerpsBalance(address: string): Promise<PerpsBalance | null> {
  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    });

    if (!response.ok) {
      console.error('[Hyperliquid] Perps balance fetch failed:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[Hyperliquid] Perps balance error:', error);
    return null;
  }
}

async function fetchHyperliquidBalance(address: string): Promise<HyperliquidBalance> {
  const [spotState, perpsState] = await Promise.all([
    fetchSpotBalance(address),
    fetchPerpsBalance(address),
  ]);

  // Extract USDC from spot balances
  let spotUsdc = 0;
  if (spotState?.balances) {
    const usdcBalance = spotState.balances.find(
      (b) => b.coin === 'USDC' || b.token === USDC_TOKEN_INDEX
    );
    if (usdcBalance) {
      spotUsdc = parseFloat(usdcBalance.total) || 0;
    }
  }

  // Extract perps account value (already in USDC)
  let perpsAccountValue = 0;
  let perpsWithdrawable = 0;
  if (perpsState) {
    perpsAccountValue = parseFloat(perpsState.marginSummary?.accountValue || perpsState.accountValue || '0');
    perpsWithdrawable = parseFloat(perpsState.withdrawable || '0');
  }

  return {
    spotUsdc,
    perpsAccountValue,
    perpsWithdrawable,
    totalUsdc: spotUsdc + perpsAccountValue,
  };
}

export function useHyperliquidBalance(address: string | null | undefined) {
  return useQuery({
    queryKey: ['hyperliquid-balance', address?.toLowerCase()],
    queryFn: () => fetchHyperliquidBalance(address!),
    enabled: !!address,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
