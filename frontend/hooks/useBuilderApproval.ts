"use client";

import { useAccount } from "wagmi";
import { useUserStore } from "@/store/userStore";
import { useToast } from "@/providers/ToastProvider";
import { useHyperliquid } from "@/hooks/useHyperliquid";

const BUILDER_CODE_ADDRESS = "0xA47D4d99191db54A4829cdf3de2417E527c3b042";

export interface BuilderApprovalResult {
  success: boolean;
  error?: string;
}

export function useBuilderApproval() {
  const hyperliquid = useHyperliquid();
  const { address, chainId } = useAccount();
  const { setBuilderApproved } = useUserStore();
  const { showToast } = useToast();

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

  const approveBuilder = async (): Promise<BuilderApprovalResult> => {
    if (!address) {
      showToast("Please connect your wallet first", "error");
      return { success: false, error: "Wallet not connected" };
    }

    if (chainId !== 1) {
      showToast("Please switch to Ethereum Mainnet", "error");
      return { success: false, error: "Wrong network" };
    }

    try {
      showToast("Approving builder code...", "success", 0);

      const res = await hyperliquid.approveBuilderFee(
        BUILDER_CODE_ADDRESS,
        "0.01%",
      );

      if (res.status == "err") {
        throw new Error(res.response || "Approval failed");
      }

      showToast("Builder code approved successfully!", "success", 5000);

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
    }
  };

  return {
    approveBuilder,
    checkMaxBuilderFee,
    isApproving: false,
    builderCodeAddress: BUILDER_CODE_ADDRESS,
    canApprove: !!address && chainId === 1,
  };
}
