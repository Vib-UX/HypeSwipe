'use client';

import { useAccount } from 'wagmi';
import { useVaultBalance } from '@/hooks/useVault';
import { useUserStore } from '@/store/userStore';
import { BTC_PRICE_USD } from '@/types';

interface BalanceCardProps {
  onDeposit: () => void;
}

export function BalanceCard({ onDeposit }: BalanceCardProps) {
  const { address: evmAddress, isConnected } = useAccount();
  const { btcAddress } = useUserStore();
  const { data: vaultData, isLoading } = useVaultBalance(evmAddress || null);

  const equityUsdc = vaultData?.equityUsdc ?? 0;
  const btcEquivalent = equityUsdc / BTC_PRICE_USD;

  // Calculate swipes available ($10 max per swipe)
  const swipesAvailable = Math.floor(equityUsdc / 10);

  if (!isConnected) {
    return (
      <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-orange-500/20 flex items-center justify-center">
          <span className="text-4xl">🎯</span>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Ready to Swipe?</h3>
        <p className="text-gray-400 text-sm mb-6">
          Connect your wallet to start trading positions like dating profiles
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-gray-500">
          <span>Swipe right = bet</span>
          <span>•</span>
          <span>Swipe left = skip</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-700 bg-gradient-to-r from-primary-500/5 to-orange-500/5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-200">Trading Balance</h2>
          {swipesAvailable > 0 && (
            <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full">
              {swipesAvailable} swipes available
            </span>
          )}
        </div>
      </div>

      {/* Balance Display */}
      <div className="p-6">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-12 bg-dark-700 rounded w-1/2 mb-2" />
            <div className="h-5 bg-dark-700 rounded w-1/3" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main Balance */}
            <div>
              <div className="text-5xl font-bold text-white mb-1">
                ${equityUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-gray-400 text-sm">
                ≈ {btcEquivalent.toFixed(6)} BTC
              </div>
            </div>

            {/* Quick Stats */}
            {equityUsdc > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="p-3 bg-dark-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Max per swipe</p>
                  <p className="text-lg font-semibold text-white">$10</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Available swipes</p>
                  <p className="text-lg font-semibold text-primary-400">{swipesAvailable}</p>
                </div>
              </div>
            )}

            {/* Connected Info */}
            {btcAddress && (
              <div className="pt-4 border-t border-dark-700">
                <div className="flex items-center justify-between p-3 bg-dark-900 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">₿</span>
                    <p className="text-sm font-mono text-gray-400">
                      {btcAddress.slice(0, 8)}...{btcAddress.slice(-6)}
                    </p>
                  </div>
                  <span className="text-xs text-green-400">Connected</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 pt-0 space-y-3">
        <button
          onClick={onDeposit}
          className="w-full px-4 py-4 bg-gradient-to-r from-orange-500 to-primary-500 hover:from-orange-600 hover:to-primary-600 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
        >
          <span className="text-xl">₿</span>
          {equityUsdc > 0 ? 'Add More Funds' : 'Fund Account'}
        </button>
        
        {equityUsdc === 0 && (
          <p className="text-xs text-gray-500 text-center">
            Native BTC or Lightning → Instant USDC
          </p>
        )}

        {/* Start Trading Button (when funded) */}
        {equityUsdc > 0 && (
          <button
            disabled
            className="w-full px-4 py-3 bg-dark-700 text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <span>👆</span>
            Start Swiping
            <span className="text-xs bg-dark-600 px-2 py-0.5 rounded ml-2">Soon</span>
          </button>
        )}
      </div>
    </div>
  );
}
