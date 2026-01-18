'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Route } from '@lifi/sdk';
import type { RouteExecutionUpdate } from '@lifi/widget';
import { useAccount } from 'wagmi';
import { useLightning } from '@/hooks/useLightning';

// Dynamic import to avoid SSR issues with Li.Fi widget
const LifiSwapWidget = dynamic(
  () => import('./LifiSwapWidget').then((mod) => mod.LifiSwapWidget),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    ),
  }
);

interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type FundMethod = 'select' | 'native' | 'lightning';

export function FundModal({ isOpen, onClose, onComplete }: FundModalProps) {
  const { address } = useAccount();
  const [method, setMethod] = useState<FundMethod>('select');
  const [swapStatus, setSwapStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [satAmount, setSatAmount] = useState('10000');
  const [isLightningProcessing, setIsLightningProcessing] = useState(false);
  const [lightningError, setLightningError] = useState<string | null>(null);
  
  const lightning = useLightning();

  const handleSwapComplete = useCallback((route: Route) => {
    console.log('[FundModal] Swap completed:', route);
    setSwapStatus('success');
    
    if (onComplete) {
      setTimeout(() => {
        onComplete();
        handleClose();
      }, 2000);
    }
  }, [onComplete]);

  const handleSwapFailed = useCallback((update: RouteExecutionUpdate) => {
    console.error('[FundModal] Swap failed:', update);
    setSwapStatus('failed');
    setTimeout(() => setSwapStatus('idle'), 3000);
  }, []);

  const handleClose = () => {
    setMethod('select');
    setSwapStatus('idle');
    setSatAmount('10000');
    setIsLightningProcessing(false);
    setLightningError(null);
    onClose();
  };

  const handleLightningDeposit = async () => {
    const sats = parseInt(satAmount);
    if (isNaN(sats) || sats < 10 || !address) return;
    
    setIsLightningProcessing(true);
    setLightningError(null);
    
    try {
      const result = await lightning.deposit(sats, address);
      
      if (result.success) {
        setSwapStatus('success');
        if (onComplete) {
          setTimeout(() => {
            onComplete();
            handleClose();
          }, 2000);
        }
      } else {
        // Handle specific errors
        const errorMsg = result.error || 'Payment failed';
        if (errorMsg.includes('closed') || errorMsg.includes('cancelled')) {
          setLightningError('Payment was cancelled');
        } else {
          setLightningError(errorMsg);
        }
      }
    } catch (error) {
      console.error('[FundModal] Lightning deposit failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Payment failed';
      if (errorMsg.includes('closed') || errorMsg.includes('cancelled')) {
        setLightningError('Payment was cancelled');
      } else {
        setLightningError(errorMsg);
      }
    } finally {
      setIsLightningProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-dark-800 rounded-t-2xl px-4 py-3 flex items-center justify-between border-b border-dark-700">
          <div className="flex items-center gap-3">
            {method !== 'select' && (
              <button
                onClick={() => setMethod('select')}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-white">Fund with BTC</h2>
              <p className="text-xs text-gray-400">
                {method === 'select' && 'Choose funding method'}
                {method === 'native' && 'Native BTC → Hyperliquid USDC'}
                {method === 'lightning' && 'Lightning → Instant USDC'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status Banner */}
        {swapStatus === 'success' && (
          <div className="bg-green-500/20 border-b border-green-500/30 px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-400 text-sm font-medium">
              Deposit completed! Balance updated.
            </span>
          </div>
        )}
        
        {swapStatus === 'failed' && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-400 text-sm font-medium">
              Deposit failed. Please try again.
            </span>
          </div>
        )}

        {/* Content */}
        <div className="bg-dark-900 rounded-b-2xl overflow-hidden">
          {/* Method Selection */}
          {method === 'select' && (
            <div className="p-4 space-y-3">
              {/* Native BTC Option */}
              <button
                onClick={() => setMethod('native')}
                className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                      <span className="text-2xl">₿</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Native BTC</p>
                      <p className="text-sm text-gray-400">On-chain via Li.Fi Bridge</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-orange-400 font-medium">~21 mins</p>
                    <p className="text-xs text-gray-500">Best rates</p>
                  </div>
                </div>
              </button>

              {/* Lightning Option */}
              <button
                onClick={() => setMethod('lightning')}
                className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div>
                      <p className="font-semibold text-white">Lightning</p>
                      <p className="text-sm text-gray-400">Instant via Alby/WebLN</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-yellow-400 font-medium">~10 secs</p>
                    <p className="text-xs text-gray-500">Instant deposit</p>
                  </div>
                </div>
              </button>

              <p className="text-xs text-gray-500 text-center pt-2">
                Both methods convert your BTC to USDC on Hyperliquid
              </p>
            </div>
          )}

          {/* Native BTC Widget */}
          {method === 'native' && (
            <LifiSwapWidget 
              sourceType="btc"
              onSwapComplete={handleSwapComplete}
              onSwapFailed={handleSwapFailed}
            />
          )}

          {/* Lightning Flow */}
          {method === 'lightning' && (
            <div className="p-4 space-y-4">
              {/* Connection Status */}
              {!lightning.isConnected ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Connect Lightning Wallet</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Connect Alby or any WebLN-compatible wallet
                  </p>
                  <button
                    onClick={lightning.connect}
                    disabled={lightning.isConnecting}
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {lightning.isConnecting ? 'Connecting...' : 'Connect Alby'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (sats)</label>
                    <input
                      type="number"
                      value={satAmount}
                      onChange={(e) => setSatAmount(e.target.value)}
                      min="10"
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white text-lg font-mono focus:outline-none focus:border-yellow-500"
                      placeholder="10000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ≈ ${((parseInt(satAmount) || 0) * 0.00095).toFixed(2)} USD
                    </p>
                  </div>

                  {/* Quick Amounts */}
                  <div className="flex gap-2">
                    {[1000, 10000, 50000, 100000].map((sats) => (
                      <button
                        key={sats}
                        onClick={() => setSatAmount(sats.toString())}
                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                          satAmount === sats.toString() 
                            ? 'bg-yellow-500 text-black' 
                            : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                        }`}
                      >
                        {sats.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Deposit Button */}
                  <button
                    onClick={handleLightningDeposit}
                    disabled={isLightningProcessing || parseInt(satAmount) < 10 || !address}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLightningProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        Pay {parseInt(satAmount).toLocaleString()} sats
                      </>
                    )}
                  </button>

                  {/* Status */}
                  {(lightningError || lightning.error) && (
                    <p className="text-sm text-red-400 text-center">{lightningError || lightning.error}</p>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    Requires Alby browser extension or WebLN wallet
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
