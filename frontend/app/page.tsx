'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { BalanceCard } from '@/components/BalanceCard';
import { BtcAddressModal } from '@/components/BtcAddressModal';
import { TopUpModal } from '@/components/TopUpModal';
import { useUserStore } from '@/store/userStore';

export default function HomePage() {
  const { isConnected } = useAccount();
  const { btcAddressConfirmed, btcAddress } = useUserStore();
  
  const [showBtcModal, setShowBtcModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Show BTC address modal after wallet connect if not yet confirmed
  useEffect(() => {
    if (isConnected && !btcAddressConfirmed) {
      // Small delay to let the wallet connection UI settle
      const timer = setTimeout(() => {
        setShowBtcModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, btcAddressConfirmed]);

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Balance */}
          <div>
            <BalanceCard 
              onTopUp={() => setShowTopUpModal(true)}
              onSetupBtc={() => setShowBtcModal(true)}
            />
          </div>

          {/* Right Column - Info/Stats */}
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-200 mb-2">
                Welcome to HypeSwipe
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Fund your trading account directly with Bitcoin. We convert your BTC to USDC 
                seamlessly in the background, so you can focus on what matters - trading.
              </p>
            </div>

            {/* How It Works */}
            <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6">
              <h3 className="text-md font-semibold text-gray-200 mb-4">How It Works</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary-400">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Connect Wallet</p>
                    <p className="text-xs text-gray-500">Link your MetaMask and provide your BTC address</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary-400">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">Top Up with BTC</p>
                    <p className="text-xs text-gray-500">Send BTC and we automatically convert to USDC</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-500">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-400">Start Trading</p>
                    <p className="text-xs text-gray-600">Swipe to trade perps (Coming Soon)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Placeholder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">BTC Price</p>
                <p className="text-lg font-semibold text-gray-200">$50,000</p>
                <p className="text-xs text-gray-500">(placeholder)</p>
              </div>
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Bridge Fee</p>
                <p className="text-lg font-semibold text-gray-200">~0.1%</p>
                <p className="text-xs text-gray-500">(varies by route)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-xs text-gray-600">
          <p>
            Powered by cross-chain bridges for seamless BTC → EVM transfers.
          </p>
          <p className="mt-1">
            MVP Version - Simulation Mode Active
          </p>
        </div>
      </main>

      {/* Modals */}
      <BtcAddressModal 
        isOpen={showBtcModal} 
        onClose={() => setShowBtcModal(false)} 
      />
      <TopUpModal 
        isOpen={showTopUpModal} 
        onClose={() => setShowTopUpModal(false)} 
      />
    </div>
  );
}
