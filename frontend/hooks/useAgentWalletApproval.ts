'use client';

import { useAccount, useSignTypedData } from 'wagmi';
import { createAgentWallet, getAgentWallet } from '@/lib/pear-api';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/providers/ToastProvider';

export interface AgentWalletApprovalResult {
  success: boolean;
  error?: string;
  txHash?: string;
  agentWalletAddress?: string;
}

export function useAgentWalletApproval() {
  const { address, chainId } = useAccount();
  const { setAgentWalletApproved } = useUserStore();
  const { signTypedDataAsync } = useSignTypedData();
  const { showToast } = useToast();

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
        setAgentWalletApproved(true, walletResponse.agentWalletAddress);
        showToast('Agent wallet already exists and approved', 'success', 5000);
        return { success: true, agentWalletAddress: walletResponse.agentWalletAddress };
      }

      showToast('Creating agent wallet...', 'success', 0);

      const createResponse = await createAgentWallet();

      if (!createResponse.agentWalletAddress) {
        throw new Error('Failed to create agent wallet');
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
          agentAddress: createResponse.agentWalletAddress,
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
          agentAddress: createResponse.agentWalletAddress,
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

      setAgentWalletApproved(true, createResponse.agentWalletAddress);

      return { success: true, txHash: data.txHash, agentWalletAddress: createResponse.agentWalletAddress };
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
    isApproving: false,
    canApprove: !!address && chainId === 1,
  };
}
