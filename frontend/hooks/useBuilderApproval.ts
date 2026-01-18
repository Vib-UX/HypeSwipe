"use client";

import { useState, useRef, useMemo } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { useUserStore } from "@/store/userStore";
import { useToast } from "@/providers/ToastProvider";
import { HyperliquidSDK } from "@/lib/hyperliquid";

const BUILDER_CODE_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

export interface BuilderApprovalResult {
  success: boolean;
  error?: string;
}

export function useBuilderApproval() {
  const { address, chainId } = useAccount();
  const { data: walletClient, isLoading: isWalletLoading } = useWalletClient();
  const { setBuilderApproved } = useUserStore();
  const { showToast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const approvalInProgress = useRef(false);

  const hyperliquid = useMemo(() => {
    return new HyperliquidSDK(walletClient ?? undefined);
  }, [walletClient]);

  const checkMaxBuilderFee = async (): Promise<{
    isApproved: boolean;
    currentMaxFee?: number;
  }> => {
    if (!address) {
      return { isApproved: false };
    }

    try {
      const res = await hyperliquid.getMaxBuilderFee(
        address,
        BUILDER_CODE_ADDRESS,
      );

      const isApproved = res > 0;
      setBuilderApproved(isApproved);

      return { isApproved, currentMaxFee: res };
    } catch (error) {
      console.error("Failed to check max builder fee:", error);
      return { isApproved: false };
    }
  };

  /**
   * Approve builder fee.
   * First checks if already approved on Hyperliquid.
   * Only prompts for signature if not yet approved.
   */
  const approveBuilder = async (): Promise<BuilderApprovalResult> => {
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
      const currentFee = await hyperliquid.getMaxBuilderFee(
        address,
        BUILDER_CODE_ADDRESS,
      );

      if (currentFee > 0) {
        setBuilderApproved(true);
        return { success: true };
      }

      const res = await hyperliquid.approveBuilderFee(
        BUILDER_CODE_ADDRESS,
        "0.01%",
      );

      if (res.status === "err") {
        throw new Error(res.response || "Approval failed");
      }

      setBuilderApproved(true);

      return { success: true };
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
    approveBuilder,
    checkMaxBuilderFee,
    isApproving,
    isWalletReady: !!walletClient && !isWalletLoading,
    builderCodeAddress: BUILDER_CODE_ADDRESS,
    canApprove:
      !!address && !!walletClient && (chainId === 1 || chainId === 42161),
  };
}
