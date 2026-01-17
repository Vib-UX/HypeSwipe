'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@/components/ConnectButton';
import { BalanceCard } from '@/components/BalanceCard';
import { BtcDepositModal } from '@/components/BtcDepositModal';

export default function HomePage() {
  const { isConnected } = useAccount();
  const [showDepositModal, setShowDepositModal] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-dark-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-orange-400 bg-clip-text text-transparent">
              HypeSwipe
            </span>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Balance */}
          <div>
            <BalanceCard 
              onDeposit={() => setShowDepositModal(true)}
            />
          </div>

          {/* Right Column - Product Info */}
          <div className="space-y-6">
            {/* Hero Card */}
            <div className="bg-gradient-to-br from-primary-500/10 via-orange-500/5 to-dark-800 border border-primary-500/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Tinder for Trading
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Swipe through positions like dating profiles. Each card = one trade setup. 
                BTC or ETH, chart pattern, leverage, long or short. Bet small, think fast, stay engaged.
              </p>
            </div>

            {/* How It Works */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6">
              <h3 className="text-md font-semibold text-gray-200 mb-4">How It Works</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">₿</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Fund with BTC</p>
                    <p className="text-xs text-gray-500">Native or Lightning → USDC on Hyperliquid</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">👆</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Swipe Positions</p>
                    <p className="text-xs text-gray-500">AI-generated cards with chart, sentiment, leverage</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Bet Small, Win Big</p>
                    <p className="text-xs text-gray-500">Max $10/trade • Up to 50x leverage • Instant fills</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-primary-400">$10</p>
                <p className="text-xs text-gray-500">Max per swipe</p>
              </div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-400">50x</p>
                <p className="text-xs text-gray-500">Max leverage</p>
              </div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-400">⚡</p>
                <p className="text-xs text-gray-500">Instant fills</p>
              </div>
            </div>

            {/* Coming Soon Teaser */}
            <div className="relative overflow-hidden bg-dark-900 border border-dark-700 rounded-2xl p-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-orange-500/5" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full font-medium">
                    Coming Soon
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Swipe Cards</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Each card shows: asset, 4H chart, AI sentiment, suggested leverage, long/short bias. 
                  Swipe right to bet, left to skip.
                </p>
                <div className="flex gap-4">
                  <div className="w-16 h-24 bg-dark-700 rounded-xl flex items-center justify-center border-2 border-dashed border-dark-600">
                    <span className="text-2xl opacity-50">📊</span>
                  </div>
                  <div className="w-16 h-24 bg-dark-700 rounded-xl flex items-center justify-center border-2 border-dashed border-dark-600 -ml-8 transform rotate-3">
                    <span className="text-2xl opacity-50">📈</span>
                  </div>
                  <div className="w-16 h-24 bg-dark-700 rounded-xl flex items-center justify-center border-2 border-dashed border-dark-600 -ml-8 transform -rotate-3">
                    <span className="text-2xl opacity-50">🎲</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-600">
          <p>
            Built on <span className="text-primary-400">Hyperliquid</span> • 
            Powered by <span className="text-orange-400">Peer Protocol</span>
          </p>
          <p className="mt-1">
            Gamified leverage trading • Not financial advice
          </p>
        </div>
      </main>

      {/* Modals */}
      <BtcDepositModal 
        isOpen={showDepositModal} 
        onClose={() => setShowDepositModal(false)} 
      />
    </div>
  );
}
