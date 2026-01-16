'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useUserStore } from '@/store/userStore';

/**
 * Shorten an address for display
 */
function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function ConnectButton() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { reset } = useUserStore();

  const handleDisconnect = () => {
    disconnect();
    reset();
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-dark-800 rounded-lg border border-dark-700">
          <span className="text-sm text-gray-300">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 text-sm bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-gray-300"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isConnecting}
      className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 rounded-lg font-medium transition-colors"
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
