'use client';

import { useState, useCallback, useEffect } from 'react';

// WebLN types
interface WebLNProvider {
  enable: () => Promise<void>;
  getInfo: () => Promise<{ alias?: string; pubkey?: string }>;
  sendPayment: (paymentRequest: string) => Promise<{ preimage: string }>;
  makeInvoice: (args: { amount: number; defaultMemo?: string }) => Promise<{ paymentRequest: string }>;
}

declare global {
  interface Window {
    webln?: WebLNProvider;
  }
}

export interface LightningState {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  walletInfo: { alias?: string; pubkey?: string } | null;
  error: string | null;
}

export interface InvoiceResponse {
  invoice: string;
  payment_hash: string;
  amount: number;
  expires_at: number;
  hyperevm_address?: string;
}

export interface PaymentResult {
  preimage: string;
  paymentHash: string;
  success: boolean;
}

/**
 * Lightning deposit configuration
 */
export const LIGHTNING_CONFIG = {
  MIN_SATS: 10, // Minimum 10 sats (micro payments welcome)
  MAX_SATS: 10_000_000, // Maximum 0.1 BTC
  
  // Backend API base URL - your Lightning backend server
  API_BASE: 'http://localhost:3001',
  
  // LSAT token info on HyperEVM
  LSAT_TOKEN: {
    address: '0x20000000000000000000000000000000000000c5',
    decimals: 8,
    symbol: 'LSAT',
  },
};

/**
 * Hook for Lightning Network payments via WebLN (Alby, etc.)
 */
export function useLightning() {
  const [state, setState] = useState<LightningState>({
    isAvailable: false,
    isConnected: false,
    isConnecting: false,
    walletInfo: null,
    error: null,
  });

  // Check WebLN availability on mount
  useEffect(() => {
    const checkAvailability = () => {
      setState(prev => ({
        ...prev,
        isAvailable: typeof window !== 'undefined' && !!window.webln,
      }));
    };

    checkAvailability();
    
    // Also check after a short delay (some extensions inject later)
    const timeout = setTimeout(checkAvailability, 1000);
    return () => clearTimeout(timeout);
  }, []);

  /**
   * Connect to WebLN provider (Alby, etc.)
   */
  const connect = useCallback(async () => {
    if (!window.webln) {
      setState(prev => ({
        ...prev,
        error: 'WebLN not available. Please install Alby or another Lightning wallet.',
      }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      await window.webln.enable();
      
      // Try to get wallet info
      let walletInfo = null;
      try {
        walletInfo = await window.webln.getInfo();
      } catch {
        // Some wallets don't support getInfo
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        walletInfo,
        error: null,
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Lightning wallet',
      }));
      return false;
    }
  }, []);

  /**
   * Disconnect from WebLN
   */
  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      walletInfo: null,
    }));
  }, []);

  /**
   * Request invoice from backend
   */
  const createInvoice = useCallback(async (
    amount: number,
    evmAddress: string,
    memo?: string
  ): Promise<InvoiceResponse | null> => {
    try {
      const response = await fetch(`${LIGHTNING_CONFIG.API_BASE}/api/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          evm_address: evmAddress,
          memo: memo || 'HypeSwipe deposit',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create invoice' }));
        throw new Error(error.message || 'Failed to create invoice');
      }

      const data = await response.json();
      console.log('[Lightning] Invoice created:', data.payment_hash);
      
      return {
        invoice: data.invoice,
        payment_hash: data.payment_hash,
        amount: data.amount,
        expires_at: data.expires_at || Math.floor(Date.now() / 1000) + 3600,
        hyperevm_address: data.hyperevm_address,
      };
    } catch (error) {
      console.error('[Lightning] Create invoice error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create invoice',
      }));
      return null;
    }
  }, []);

  /**
   * Pay a Lightning invoice via WebLN
   */
  const payInvoice = useCallback(async (invoice: string, paymentHash?: string): Promise<PaymentResult | null> => {
    // Check if WebLN is available
    if (!window.webln) {
      setState(prev => ({ ...prev, error: 'WebLN not available. Please install Alby.' }));
      return null;
    }
    
    // Ensure connected
    if (!state.isConnected) {
      try {
        await window.webln.enable();
      } catch (e) {
        setState(prev => ({ ...prev, error: 'Please connect your Lightning wallet' }));
        return null;
      }
    }

    try {
      console.log('[Lightning] Paying invoice:', invoice.slice(0, 50) + '...');
      const result = await window.webln.sendPayment(invoice);
      
      if (!result.preimage) {
        throw new Error('Payment failed - no preimage received');
      }

      console.log('[Lightning] Payment successful, preimage:', result.preimage.slice(0, 16) + '...');
      
      return {
        preimage: result.preimage,
        paymentHash: paymentHash || '',
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';
      console.error('[Lightning] Payment error:', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg }));
      return null;
    }
  }, [state.isConnected]);

  /**
   * Verify payment with backend
   */
  const verifyPayment = useCallback(async (
    paymentHash: string,
    preimage: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${LIGHTNING_CONFIG.API_BASE}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_hash: paymentHash,
          preimage,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      const data = await response.json();
      console.log('[Lightning] Payment verified:', data);
      return data.verified === true || data.success === true;
    } catch (error) {
      console.error('[Lightning] Verify payment error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Payment verification failed',
      }));
      return false;
    }
  }, []);

  /**
   * Full deposit flow: create invoice → pay → verify
   */
  const deposit = useCallback(async (
    amount: number,
    evmAddress: string
  ): Promise<{ success: boolean; paymentHash?: string; error?: string }> => {
    setState(prev => ({ ...prev, error: null }));

    // Validate amount
    if (amount < LIGHTNING_CONFIG.MIN_SATS) {
      return { success: false, error: `Minimum ${LIGHTNING_CONFIG.MIN_SATS} sats` };
    }
    if (amount > LIGHTNING_CONFIG.MAX_SATS) {
      return { success: false, error: `Maximum ${LIGHTNING_CONFIG.MAX_SATS} sats` };
    }

    // Ensure WebLN is available
    if (!window.webln) {
      return { success: false, error: 'Please install Alby or another WebLN wallet' };
    }
    
    // Ensure connected
    if (!state.isConnected) {
      const connected = await connect();
      if (!connected) {
        return { success: false, error: 'Failed to connect Lightning wallet' };
      }
    }

    // Create invoice
    const invoiceData = await createInvoice(amount, evmAddress);
    if (!invoiceData) {
      return { success: false, error: 'Failed to create invoice' };
    }

    // Pay invoice (pass payment_hash for reference)
    const paymentResult = await payInvoice(invoiceData.invoice, invoiceData.payment_hash);
    if (!paymentResult) {
      return { success: false, error: state.error || 'Payment failed or was cancelled' };
    }

    // Verify payment
    const verified = await verifyPayment(invoiceData.payment_hash, paymentResult.preimage);
    if (!verified) {
      return { 
        success: false, 
        error: 'Payment sent but verification failed. Contact support.',
        paymentHash: invoiceData.payment_hash,
      };
    }

    return { 
      success: true, 
      paymentHash: invoiceData.payment_hash,
    };
  }, [state.isConnected, connect, createInvoice, payInvoice, verifyPayment]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    createInvoice,
    payInvoice,
    verifyPayment,
    deposit,
    clearError,
  };
}
