'use client';

import { useAccount } from 'wagmi';
import { useUserStore, AuthStatus } from '@/store/userStore';

/**
 * Configuration for each auth status state
 */
interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STATUS_CONFIG: Record<AuthStatus, StatusConfig> = {
  not_connected: {
    label: 'Not Connected',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
  connected: {
    label: 'Connected',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  authenticated: {
    label: 'Authenticated',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  ready_to_trade: {
    label: 'Ready to Trade',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
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
 */
export function AuthStatusIndicator() {
  const { isConnected } = useAccount();
  const getAuthStatus = useUserStore((state) => state.getAuthStatus);

  // Get computed auth status from Zustand
  const authStatus = getAuthStatus(isConnected);
  const config = STATUS_CONFIG[authStatus];

  return (
    <div
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
        ${config.bgColor} ${config.borderColor} ${config.color}`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            authStatus === 'not_connected' ? 'bg-gray-400' :
            authStatus === 'connected' ? 'bg-yellow-400' :
            authStatus === 'authenticated' ? 'bg-blue-400' :
            'bg-green-400'
          }`}
        />
        {config.label}
      </span>
    </div>
  );
}