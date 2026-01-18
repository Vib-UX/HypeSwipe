"use client";

import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
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
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const getAuthStatus = useUserStore((state) => state.getAuthStatus);

  const authStatus = getAuthStatus(isConnected);
  const config = STATUS_CONFIG[authStatus];
  const isReadyToTrade = authStatus === "ready_to_trade";

  const displayLabel = (() => {
    if (isConnected && address && authStatus !== "not_connected") {
      return shortenAddress(address);
    }
    return config.label;
  })();

  const handleClick = () => {
    if (!isReadyToTrade) {
      router.push("/auth");
    }
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnect();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={isReadyToTrade}
        aria-label={
          isReadyToTrade
            ? `Status: ${config.label}`
            : `Status: ${config.label}. Click to complete authentication.`
        }
        className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap
          ${config.bgColor} ${config.borderColor} ${config.color}
          ${isReadyToTrade ? "cursor-default" : "cursor-pointer hover:opacity-80"}`}
      >
        <span className="flex items-center gap-1.5 sm:gap-2">
          {config.isComplete ? (
            <CheckmarkIcon className={config.color} />
          ) : (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotColor}`}
            />
          )}
          {displayLabel}
        </span>
      </button>

      {isConnected && (
        <button
          onClick={handleDisconnect}
          aria-label="Disconnect wallet"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
