/**
 * In-memory Vault Storage
 * 
 * Simple key-value store for user balances.
 * In production, this would be replaced with a proper database.
 */

import type { VaultState } from '@/types';

// In-memory storage for vault states
// Key: lowercased EVM address, Value: VaultState
const vaultStorage = new Map<string, VaultState>();

/**
 * Normalize an EVM address to lowercase for consistent lookups
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

/**
 * Get the vault state for a user
 * @param address - EVM address
 * @returns VaultState or undefined if not found
 */
export function getVaultState(address: string): VaultState | undefined {
  const normalized = normalizeAddress(address);
  return vaultStorage.get(normalized);
}

/**
 * Get the USDC equity for a user
 * @param address - EVM address
 * @returns equityUsdc or 0 if not found
 */
export function getEquityUsdc(address: string): number {
  const state = getVaultState(address);
  return state?.equityUsdc ?? 0;
}

/**
 * Credit USDC to a user's vault
 * @param address - EVM address
 * @param amountUsdc - Amount to credit (can be decimal)
 * @returns Updated VaultState
 */
export function creditVault(address: string, amountUsdc: number): VaultState {
  const normalized = normalizeAddress(address);
  const existing = vaultStorage.get(normalized);

  const updated: VaultState = {
    userAddress: normalized,
    equityUsdc: (existing?.equityUsdc ?? 0) + amountUsdc,
  };

  vaultStorage.set(normalized, updated);
  return updated;
}

/**
 * Debit USDC from a user's vault
 * @param address - EVM address
 * @param amountUsdc - Amount to debit
 * @returns Updated VaultState
 * @throws Error if insufficient balance
 */
export function debitVault(address: string, amountUsdc: number): VaultState {
  const normalized = normalizeAddress(address);
  const existing = vaultStorage.get(normalized);
  const currentBalance = existing?.equityUsdc ?? 0;

  if (currentBalance < amountUsdc) {
    throw new Error(`Insufficient balance: ${currentBalance} < ${amountUsdc}`);
  }

  const updated: VaultState = {
    userAddress: normalized,
    equityUsdc: currentBalance - amountUsdc,
  };

  vaultStorage.set(normalized, updated);
  return updated;
}

/**
 * Initialize a vault for a new user (if not exists)
 * @param address - EVM address
 * @returns VaultState
 */
export function initializeVault(address: string): VaultState {
  const normalized = normalizeAddress(address);
  
  if (!vaultStorage.has(normalized)) {
    const initial: VaultState = {
      userAddress: normalized,
      equityUsdc: 0,
    };
    vaultStorage.set(normalized, initial);
    return initial;
  }

  return vaultStorage.get(normalized)!;
}

/**
 * Get all vault states (for debugging/admin purposes)
 */
export function getAllVaults(): VaultState[] {
  return Array.from(vaultStorage.values());
}

/**
 * Clear all vault data (for testing purposes)
 */
export function clearAllVaults(): void {
  vaultStorage.clear();
}
