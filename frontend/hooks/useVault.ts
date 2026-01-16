'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VaultResponse, VaultCreditRequest } from '@/types';

/**
 * Fetch vault balance for an address
 */
async function fetchVaultBalance(address: string): Promise<VaultResponse> {
  const response = await fetch(`/api/vault?address=${address}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch vault balance');
  }
  
  return response.json();
}

/**
 * Credit vault with USDC
 */
async function creditVault(data: VaultCreditRequest): Promise<VaultResponse> {
  const response = await fetch('/api/vault/credit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to credit vault');
  }
  
  return response.json();
}

/**
 * Hook to fetch and manage vault balance
 */
export function useVaultBalance(address: string | null) {
  return useQuery({
    queryKey: ['vault', address],
    queryFn: () => fetchVaultBalance(address!),
    enabled: !!address,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to credit the vault
 */
export function useCreditVault() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: creditVault,
    onSuccess: (data, variables) => {
      // Invalidate and refetch vault balance
      queryClient.invalidateQueries({ queryKey: ['vault', variables.address] });
    },
  });
}
