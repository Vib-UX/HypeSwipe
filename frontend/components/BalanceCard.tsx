'use client';

import { useAccount } from 'wagmi';
import { useVaultBalance } from '@/hooks/useVault';
import { useHyperliquidBalance } from '@/hooks/useHyperliquidBalance';
import { useUserStore } from '@/store/userStore';
import { BTC_PRICE_USD } from '@/types';

interface BalanceCardProps {
  onDeposit: () => void;
  onBridgeUsdc?: () => void;
}

export function BalanceCard({ onDeposit, onBridgeUsdc }: BalanceCardProps) {
  const { address: evmAddress, isConnected } = useAccount();
  const { btcAddress } = useUserStore();
  const { data: vaultData, isLoading: isVaultLoading } = useVaultBalance(evmAddress || null);
  const { data: hlBalance, isLoading: isHlLoading } = useHyperliquidBalance(evmAddress);

  const vaultEquity = vaultData?.equityUsdc ?? 0;
  const hlSpotUsdc = hlBalance?.spotUsdc ?? 0;
  const hlPerpsValue = hlBalance?.perpsAccountValue ?? 0;
  const totalUsdc = vaultEquity + (hlBalance?.totalUsdc ?? 0);
  const btcEquivalent = totalUsdc / BTC_PRICE_USD;

  const isLoading = isVaultLoading || isHlLoading;

  // Calculate swipes available ($10 max per swipe)
  const swipesAvailable = Math.floor(totalUsdc / 10);

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
                ${totalUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-gray-400 text-sm">
                ≈ {btcEquivalent.toFixed(6)} BTC
              </div>
            </div>

            {/* Hyperliquid Balance Breakdown */}
            {(hlSpotUsdc > 0 || hlPerpsValue > 0) && (
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">HL</span>
                  </div>
                  <span className="text-sm font-medium text-gray-200">Hyperliquid Balance</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Spot USDC</p>
                    <p className="font-medium text-white">${hlSpotUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Perps Account</p>
                    <p className="font-medium text-white">${hlPerpsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            {totalUsdc > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-dark-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Per trade</p>
                  <p className="text-lg font-semibold text-white">≤ $10</p>
                </div>
                <div className="p-3 bg-dark-900 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Trades available</p>
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
        {/* Primary: Fund with BTC */}
        <button
          onClick={onDeposit}
          className="w-full px-4 py-4 bg-gradient-to-r from-orange-500 to-primary-500 hover:from-orange-600 hover:to-primary-600 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20"
        >
          <span className="text-xl">₿</span>
          Fund with BTC
        </button>

        {/* Secondary: Bridge USDC */}
        {onBridgeUsdc && (
          <button
            onClick={onBridgeUsdc}
            className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 border border-dark-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-gray-200"
          >
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Bridge USDC from Arbitrum
          </button>
        )}
        
        {totalUsdc === 0 && (
          <p className="text-xs text-gray-500 text-center">
            BTC (Native/Lightning) or USDC (Arbitrum) → Hyperliquid
          </p>
        )}

        {/* Start Trading Button (when funded) */}
        {totalUsdc > 0 && (
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
