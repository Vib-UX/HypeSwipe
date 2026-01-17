'use client';

import { useState, useCallback } from 'react';
import { request, RpcErrorCode } from 'sats-connect';
import type { LifiQuoteResponse } from '@/types';
import { hex } from '@scure/base';

/**
 * Xverse BTC transaction signing hook
 * 
 * Uses sats-connect library for Bitcoin PSBT signing.
 * Docs: https://docs.xverse.app/sats-connect/bitcoin-methods/signpsbt
 */

export interface BtcTransactionState {
  status: 'idle' | 'signing' | 'broadcasting' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
}

export interface SendBtcParams {
  quote: LifiQuoteResponse;
  btcAddress: string;
}

/**
 * Convert hex string to base64
 * Xverse expects PSBTs in base64 format
 */
function hexToBase64(hexString: string): string {
  // Remove 0x prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  const bytes = hex.decode(cleanHex);
  
  // Convert to base64
  if (typeof window !== 'undefined' && window.btoa) {
    const binary = String.fromCharCode.apply(null, Array.from(bytes));
    return window.btoa(binary);
  }
  
  // Node.js fallback
  return Buffer.from(bytes).toString('base64');
}

/**
 * Sign and broadcast a BTC transaction using Xverse wallet
 * 
 * For Li.Fi BTC transactions:
 * - transactionRequest.data contains the PSBT in hex format
 * - We convert it to base64 for Xverse
 * - Set broadcast: true to broadcast after signing
 */
async function signAndSendBtcTransaction(
  quote: LifiQuoteResponse,
  fromAddress: string
): Promise<string> {
  const { transactionRequest } = quote;
  
  // Li.Fi provides PSBT in hex format, Xverse needs base64
  const psbtBase64 = hexToBase64(transactionRequest.data);
  
  // Request signature from Xverse
  // signInputs maps addresses to input indexes - we'll sign all inputs with the payment address
  const response = await request('signPsbt', {
    psbt: psbtBase64,
    signInputs: {
      [fromAddress]: [0], // Sign input 0 with the from address
    },
    broadcast: true, // Broadcast immediately after signing
  });

  if (response.status === 'success') {
    // If broadcast was successful, txid will be returned
    if (response.result.txid) {
      return response.result.txid;
    }
    
    // If only signed PSBT returned (shouldn't happen with broadcast: true)
    throw new Error('Transaction signed but not broadcast. PSBT: ' + response.result.psbt?.slice(0, 50) + '...');
  } else {
    // Handle error
    if (response.error.code === RpcErrorCode.USER_REJECTION) {
      throw new Error('Transaction was rejected by user');
    }
    throw new Error(response.error.message || 'Failed to sign transaction');
  }
}

/**
 * Hook to send BTC transactions via Xverse wallet
 */
export function useBtcTransaction() {
  const [state, setState] = useState<BtcTransactionState>({
    status: 'idle',
    txHash: null,
    error: null,
  });

  const sendTransaction = useCallback(async ({ quote, btcAddress }: SendBtcParams) => {
    setState({ status: 'signing', txHash: null, error: null });

    try {
      const txHash = await signAndSendBtcTransaction(quote, btcAddress);
      
      setState({ status: 'success', txHash, error: null });
      
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setState({ status: 'error', txHash: null, error: errorMessage });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', txHash: null, error: null });
  }, []);

  return {
    ...state,
    sendTransaction,
    reset,
    isLoading: state.status === 'signing' || state.status === 'broadcasting',
  };
}
