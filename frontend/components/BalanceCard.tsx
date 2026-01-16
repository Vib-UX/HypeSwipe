'use client';

import { useAccount } from 'wagmi';
import { useVaultBalance } from '@/hooks/useVault';
import { useUserStore } from '@/store/userStore';
import { BTC_PRICE_USD } from '@/types';

/**
 * Shorten an address for display
 */
function shortenAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

interface BalanceCardProps {
  onTopUp: () => void;
  onSetupBtc: () => void;
}

export function BalanceCard({ onTopUp, onSetupBtc }: BalanceCardProps) {
  const { address: evmAddress, isConnected } = useAccount();
  const { btcAddress } = useUserStore();
  const { data: vaultData, isLoading, error } = useVaultBalance(evmAddress || null);

  const equityUsdc = vaultData?.equityUsdc ?? 0;
  // Convert USDC to BTC equivalent using placeholder price
  const btcEquivalent = equityUsdc / BTC_PRICE_USD;

  if (!isConnected) {
    return (
      <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-300 mb-2">Connect Your Wallet</h3>
        <p className="text-gray-500 text-sm">
          Connect your MetaMask wallet to view your balance and start trading.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-gray-200">HypeSwipe Balance</h2>
      </div>

      {/* Balance Display */}
      <div className="p-6">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-10 bg-dark-700 rounded w-1/2 mb-2" />
            <div className="h-5 bg-dark-700 rounded w-1/3" />
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm">Failed to load balance</div>
        ) : (
          <div className="space-y-4">
            {/* Main Balance */}
            <div>
              <div className="text-4xl font-bold text-white mb-1">
                ${equityUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-gray-400 text-sm">
                ≈ {btcEquivalent.toFixed(6)} BTC
              </div>
            </div>

            {/* Addresses */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">EVM Address</p>
                  <p className="text-sm font-mono text-gray-300">
                    {evmAddress ? shortenAddress(evmAddress) : '-'}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xs text-blue-400">ETH</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">BTC Address</p>
                  {btcAddress ? (
                    <p className="text-sm font-mono text-gray-300">
                      {shortenAddress(btcAddress, 8)}
                    </p>
                  ) : (
                    <button
                      onClick={onSetupBtc}
                      className="text-sm text-primary-400 hover:text-primary-300"
                    >
                      Set up BTC address →
                    </button>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-xs text-orange-400">BTC</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 pt-0">
        <button
          onClick={onTopUp}
          disabled={!btcAddress}
          className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:text-gray-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Top up with BTC
        </button>
        {!btcAddress && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Set up your BTC address first to enable deposits
          </p>
        )}
      </div>

      {/* Future Trading Section Stub */}
      <div className="p-6 pt-0">
        <div className="p-4 bg-dark-900/50 border border-dashed border-dark-600 rounded-xl">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div>
              <p className="text-sm font-medium">Swipe Trading</p>
              <p className="text-xs">Coming soon - Pear/Hyperliquid integration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
