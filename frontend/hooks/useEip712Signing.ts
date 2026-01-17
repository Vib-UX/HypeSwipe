'use client';

import { useAccount, useSignTypedData } from 'wagmi';
import { useToast } from '@/providers/ToastProvider';

export interface Eip712Message {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract?: `0x${string}`;
  };
  types: {
    Authentication: Array<{
      name: string;
      type: string;
    }>;
  };
  primaryType: string;
  message: {
    address: string;
    clientId: string;
    timestamp: number;
    action: string;
  };
  timestamp: number;
}

export interface PearAuthResult {
  signature: string;
  timestamp: number;
}

export function useEip712Signing() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { showToast } = useToast();

  const signEip712Message = async (
    eip712Data: Eip712Message
  ): Promise<PearAuthResult> => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await signTypedDataAsync({
        domain: eip712Data.domain,
        types: eip712Data.types as any,
        primaryType: eip712Data.primaryType as any,
        message: eip712Data.message as any,
      });

      return {
        signature,
        timestamp: eip712Data.timestamp,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'UserRejectedRequestError') {
        showToast('Signature rejected by user', 'error');
        throw new Error('User rejected signature');
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to sign message';
      showToast(errorMessage, 'error');
      throw error;
    }
  };

  return {
    signEip712Message,
    isConnected: !!address,
  };
}
