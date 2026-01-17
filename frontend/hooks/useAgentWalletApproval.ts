'use client';

import { useAccount, useSignTypedData } from 'wagmi';
import { createAgentWallet, getAgentWallet, PearApiException } from '@/lib/pear-api';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/providers/ToastProvider';
import { useHyperliquid } from '@/hooks/useHyperliquid';

export interface AgentWalletApprovalResult {
  success: boolean;
  error?: string;
  txHash?: string;
  agentWalletAddress?: string;
}

export interface AgentWalletStatusResult {
  hasAgentWallet: boolean;
  isApproved: boolean;
  agentWalletAddress?: string;
}

export function useAgentWalletApproval() {
  const { address, chainId } = useAccount();
  const { setAgentWalletApproved, pearAccessToken } = useUserStore();
  const { signTypedDataAsync } = useSignTypedData();
  const { showToast } = useToast();
  const hyperliquid = useHyperliquid();

  const checkAgentWalletStatus = async (): Promise<AgentWalletStatusResult> => {
    if (!address) {
      return { hasAgentWallet: false, isApproved: false };
    }

    if (!pearAccessToken) {
      return { hasAgentWallet: false, isApproved: false };
    }

    try {
      const walletResponse = await getAgentWallet();

      if (!walletResponse.agentWalletAddress) {
        return { hasAgentWallet: false, isApproved: false };
      }

      const isApproved = await hyperliquid.isAgentApproved(
        address,
        walletResponse.agentWalletAddress
      );

      setAgentWalletApproved(isApproved, walletResponse.agentWalletAddress);

      return {
        hasAgentWallet: true,
        isApproved,
        agentWalletAddress: walletResponse.agentWalletAddress,
      };
    } catch (error) {
      if (error instanceof PearApiException && error.statusCode === 404) {
        return { hasAgentWallet: false, isApproved: false };
      }

      console.error('Failed to check agent wallet status:', error);
      return { hasAgentWallet: false, isApproved: false };
    }
  };

  const approveAgent = async (): Promise<AgentWalletApprovalResult> => {
    if (!address) {
      showToast('Please connect your wallet first', 'error');
      return { success: false, error: 'Wallet not connected' };
    }

    if (chainId !== 1) {
      showToast('Please switch to Ethereum Mainnet', 'error');
      return { success: false, error: 'Wrong network' };
    }

    try {
      const walletResponse = await getAgentWallet();

      if (walletResponse.agentWalletAddress) {
        const isApproved = await hyperliquid.isAgentApproved(
          address,
          walletResponse.agentWalletAddress
        );

        if (isApproved) {
          setAgentWalletApproved(true, walletResponse.agentWalletAddress);
          showToast('Agent wallet already exists and approved', 'success', 5000);
          return { success: true, agentWalletAddress: walletResponse.agentWalletAddress };
        }
      }

      let agentWalletAddress = walletResponse.agentWalletAddress;

      if (!agentWalletAddress) {
        showToast('Creating agent wallet...', 'success', 0);
        const createResponse = await createAgentWallet();

        if (!createResponse.agentWalletAddress) {
          throw new Error('Failed to create agent wallet');
        }

        agentWalletAddress = createResponse.agentWalletAddress;
      }

      showToast('Approving agent wallet on Hyperliquid...', 'success', 0);

      const signature = await signTypedDataAsync({
        domain: {
          name: 'Exchange',
          version: '1',
          chainId: 1,
          verifyingContract: '0x0000000000000000000000000000000000000000000000000000000000000000000000',
        },
        types: {
          ApproveAgent: [
            { name: 'action', type: 'string' },
            { name: 'hyperliquidChain', type: 'string' },
            { name: 'signatureChainId', type: 'string' },
            { name: 'agentAddress', type: 'address' },
            { name: 'nonce', type: 'uint256' },
          ],
        },
        primaryType: 'ApproveAgent',
        message: {
          action: 'approveAgent',
          hyperliquidChain: 'Mainnet',
          signatureChainId: '0xa4b1',
          agentAddress: agentWalletAddress,
          nonce: Date.now().toString(),
        },
      } as any);

      const response = await fetch('https://api.hyperliquid.xyz/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approveAgent',
          hyperliquidChain: 'Mainnet',
          signatureChainId: '0xa4b1',
          agentAddress: agentWalletAddress,
          nonce: Date.now().toString(),
          signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Approval failed');
      }

      const data = await response.json();

      showToast('Agent wallet approved successfully!', 'success', 5000);

      setAgentWalletApproved(true, agentWalletAddress);

      return { success: true, txHash: data.txHash, agentWalletAddress };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Approval failed';

      if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
        showToast('Transaction cancelled by user', 'error', 5000);
      } else {
        showToast(errorMessage, 'error', 5000);
      }

      return { success: false, error: errorMessage };
    }
  };

  return {
    approveAgent,
    checkAgentWalletStatus,
    isApproving: false,
    canApprove: !!address && chainId === 1,
  };
}
