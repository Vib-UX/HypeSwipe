"use client";

import { useState, useRef, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { createAgentWallet, getAccountSummary } from "@/lib/pear-api";
import { useUserStore } from "@/store/userStore";
import { useToast } from "@/providers/ToastProvider";
import { HyperliquidSDK } from "@/lib/hyperliquid";

export interface AgentWalletApprovalResult {
  success: boolean;
  error?: string;
  agentWalletAddress?: string;
}

export interface AgentWalletStatusResult {
  hasAgentWallet: boolean;
  agentWalletAddress?: string;
}

export function useAgentWalletApproval() {
  const { address, chainId } = useAccount();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
  const {
    setAgentWalletApproved,
    pearAccessToken,
    agentWalletAddress: cachedAddress,
  } = useUserStore();
  const { showToast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const approvalInProgress = useRef(false);

  const hyperliquid = useMemo(() => {
    return new HyperliquidSDK(walletClient ?? undefined);
  }, [walletClient]);

  const checkAgentWalletStatus = async (): Promise<AgentWalletStatusResult> => {
    if (!address || !pearAccessToken) {
      return { hasAgentWallet: false };
    }

    if (cachedAddress) {
      return {
        hasAgentWallet: true,
        agentWalletAddress: cachedAddress,
      };
    }

    try {
      const account = await getAccountSummary();

      if (account.agentWalletAddress) {
        setAgentWalletApproved(true, account.agentWalletAddress);
        return {
          hasAgentWallet: true,
          agentWalletAddress: account.agentWalletAddress,
        };
      }

      setAgentWalletApproved(false, null);
      return { hasAgentWallet: false };
    } catch (error) {
      console.error("Failed to check account status:", error);
      return { hasAgentWallet: false };
    }
  };

  const approveAgent = async (): Promise<AgentWalletApprovalResult> => {
    if (approvalInProgress.current || isApproving) {
      return { success: false, error: "Approval already in progress" };
    }

    if (!address) {
      showToast("Please connect your wallet first", "error");
      return { success: false, error: "Wallet not connected" };
    }

    if (chainId !== 1 && chainId !== 42161) {
      showToast("Please switch to Ethereum or Arbitrum", "error");
      return { success: false, error: "Wrong network" };
    }

    if (!walletClient) {
      showToast("Wallet not ready. Please try again.", "error");
      return { success: false, error: "Wallet client not ready" };
    }

    approvalInProgress.current = true;
    setIsApproving(true);

    try {
      const account = await getAccountSummary();

      if (account.agentWalletAddress) {
        setAgentWalletApproved(true, account.agentWalletAddress);
        showToast("Agent wallet already set up!", "success", 3000);
        return { success: true, agentWalletAddress: account.agentWalletAddress };
      }

      showToast("Creating agent wallet...", "success", 0);
      const createResponse = await createAgentWallet();

      if (!createResponse.agentWalletAddress) {
        throw new Error("Failed to create agent wallet");
      }

      const agentWalletAddress = createResponse.agentWalletAddress;

      showToast("Please sign to approve agent wallet...", "success", 0);

      const result = await hyperliquid.approveAgent(agentWalletAddress);

      if (!result || result.status === "err") {
        throw new Error(result?.response || "Approval failed");
      }

      showToast("Agent wallet approved successfully!", "success", 5000);
      setAgentWalletApproved(true, agentWalletAddress);

      return { success: true, agentWalletAddress };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Approval failed";

      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied")
      ) {
        showToast("Transaction cancelled by user", "error", 5000);
      } else {
        showToast(errorMessage, "error", 5000);
      }

      return { success: false, error: errorMessage };
    } finally {
      approvalInProgress.current = false;
      setIsApproving(false);
    }
  };

  return {
    approveAgent,
    checkAgentWalletStatus,
    isApproving,
    isWalletReady: !!walletClient && !isWalletLoading,
    canApprove:
      !!address && !!walletClient && (chainId === 1 || chainId === 42161),
  };
}
