"use client";

import { useAccount } from "wagmi";
import { useUserStore, AuthStatus } from "@/store/userStore";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 3L4.5 8.5L2 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Configuration for each auth status state
 */
interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  isComplete: boolean;
}

const STATUS_CONFIG: Record<AuthStatus, StatusConfig> = {
  not_connected: {
    label: "Not Connected",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    dotColor: "bg-gray-400",
    isComplete: false,
  },
  connected: {
    label: "Connected",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    dotColor: "bg-yellow-400",
    isComplete: false,
  },
  authenticated: {
    label: "Authenticated",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    dotColor: "bg-blue-400",
    isComplete: false,
  },
  ready_to_trade: {
    label: "Ready to Trade",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    dotColor: "bg-green-400",
    isComplete: true,
  },
};

/**
 * AuthStatusIndicator displays the current authentication status
 * using color-coded badges based on the auth state from Zustand store.
 *
 * Status progression:
 * - Not Connected (gray): Wallet not connected
 * - Connected (yellow): Wallet connected, not authenticated with Pear
 * - Authenticated (blue): Authenticated with Pear, approvals pending
 * - Ready to Trade (green): All approvals complete
 *
 */
export function AuthStatusIndicator() {
  const { isConnected, address } = useAccount();
  const getAuthStatus = useUserStore((state) => state.getAuthStatus);

  const authStatus = getAuthStatus(isConnected);
  const config = STATUS_CONFIG[authStatus];

  const displayLabel = (() => {
    if (isConnected && address && authStatus !== "not_connected") {
      return shortenAddress(address);
    }
    return config.label;
  })();

  return (
    <div
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
        ${config.bgColor} ${config.borderColor} ${config.color}`}
    >
      <span className="flex items-center gap-2">
        {config.isComplete ? (
          <CheckmarkIcon className={config.color} />
        ) : (
          <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        )}
        {displayLabel}
      </span>
    </div>
  );
}
