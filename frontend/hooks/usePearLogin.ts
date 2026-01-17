'use client';

import { useAccount } from 'wagmi';
import { getEip712Message, authenticateWithSignature } from '@/lib/pear-api';
import { useEip712Signing } from './useEip712Signing';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/providers/ToastProvider';

export interface PearLoginResult {
  success: boolean;
  error?: string;
}

export function usePearLogin() {
  const { address } = useAccount();
  const { signEip712Message } = useEip712Signing();
  const { setPearTokens } = useUserStore();
  const { showToast } = useToast();

  const login = async (clientId: string = 'HLHackathon8'): Promise<PearLoginResult> => {
    if (!address) {
      showToast('Please connect your wallet first', 'error');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      showToast('Authenticating...', 'success', 0);

      const eip712Data = await getEip712Message(address, clientId) as any;

      const { signature, timestamp } = await signEip712Message(eip712Data);

      const authResponse = await authenticateWithSignature(
        address,
        clientId,
        signature,
        timestamp
      ) as any;

      setPearTokens(authResponse.accessToken, authResponse.refreshToken);

      showToast('Authentication successful!', 'success', 5000);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

      if (errorMessage.includes('User rejected')) {
        showToast('Signature cancelled by user', 'error', 5000);
      } else {
        showToast(errorMessage, 'error', 5000);
      }

      return { success: false, error: errorMessage };
    }
  };

  return {
    login,
    canLogin: !!address,
  };
}
