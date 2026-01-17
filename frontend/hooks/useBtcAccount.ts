'use client';

import { useState, useCallback, useEffect } from 'react';
import { request, RpcErrorCode, getProviders, AddressPurpose, type Provider } from 'sats-connect';

/**
 * Hook to connect to Xverse wallet and get BTC addresses
 * 
 * Uses sats-connect library with wallet_connect method.
 * Docs: https://docs.xverse.app/sats-connect/connecting-to-the-wallet
 */

export interface BtcAccount {
  address: string;
  publicKey: string;
  purpose: 'payment' | 'ordinals';
  type: 'p2wpkh' | 'p2tr';
}

export interface UseBtcAccountResult {
  btcAccounts: BtcAccount[];
  paymentAccount: BtcAccount | null;
  ordinalsAccount: BtcAccount | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  isConnected: boolean;
  availableWallets: Provider[];
  requestAccounts: () => Promise<BtcAccount[]>;
  connect: () => Promise<string | null>;
  disconnect: () => void;
}

/**
 * Hook to manage BTC accounts from Xverse wallet
 */
export function useBtcAccount(): UseBtcAccountResult {
  const [btcAccounts, setBtcAccounts] = useState<BtcAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Provider[]>([]);

  // Check for available Bitcoin wallets on mount
  useEffect(() => {
    const checkWallets = async () => {
      try {
        const providers = await getProviders();
        setAvailableWallets(providers);
      } catch {
        setAvailableWallets([]);
      }
    };
    checkWallets();
  }, []);

  const requestAccounts = useCallback(async (): Promise<BtcAccount[]> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if any Bitcoin wallet is available
      const providers = await getProviders();
      
      if (providers.length === 0) {
        throw new Error(
          'No Bitcoin wallet detected. Please install Xverse wallet extension.'
        );
      }

      // Use wallet_connect to request connection and get addresses
      const response = await request('wallet_connect', {
        addresses: [AddressPurpose.Payment, AddressPurpose.Ordinals],
        message: 'HypeSwipe needs access to your Bitcoin addresses for deposits',
      });

      if (response.status === 'success') {
        const accounts: BtcAccount[] = response.result.addresses.map((addr) => ({
          address: addr.address,
          publicKey: addr.publicKey,
          purpose: addr.purpose as 'payment' | 'ordinals',
          type: addr.purpose === 'payment' ? 'p2wpkh' : 'p2tr',
        }));

        setBtcAccounts(accounts);
        return accounts;
      } else {
        // Handle specific error codes
        const errorCode = response.error.code;
        const errorMsg = response.error.message;

        if (errorCode === RpcErrorCode.USER_REJECTION) {
          throw new Error('Connection request was cancelled');
        }
        if (errorCode === RpcErrorCode.ACCESS_DENIED) {
          throw new Error(
            'Access denied. Please unlock your Xverse wallet and try again.'
          );
        }
        if (errorCode === RpcErrorCode.INTERNAL_ERROR) {
          throw new Error('Wallet error. Please make sure Xverse is unlocked.');
        }
        
        throw new Error(errorMsg || 'Failed to connect wallet');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to wallet';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setBtcAccounts([]);
    setError(null);
  }, []);

  // Get the payment account (Native SegWit - for sending BTC)
  const paymentAccount = btcAccounts.find(a => a.purpose === 'payment') || null;
  
  // Get the ordinals account (Taproot)
  const ordinalsAccount = btcAccounts.find(a => a.purpose === 'ordinals') || null;

  // Convenience method that connects and returns the payment address
  const connect = useCallback(async (): Promise<string | null> => {
    const accounts = await requestAccounts();
    const payment = accounts.find(a => a.purpose === 'payment');
    return payment?.address || null;
  }, [requestAccounts]);

  return {
    btcAccounts,
    paymentAccount,
    ordinalsAccount,
    isLoading,
    isConnecting: isLoading,
    error,
    isConnected: btcAccounts.length > 0,
    availableWallets,
    requestAccounts,
    connect,
    disconnect,
  };
}
