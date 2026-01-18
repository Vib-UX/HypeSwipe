'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Route } from '@lifi/sdk';
import type { RouteExecutionUpdate } from '@lifi/widget';
import type { WidgetSourceType } from './LifiSwapWidget';

// Dynamic import to avoid SSR issues with Li.Fi widget
const LifiSwapWidget = dynamic(
  () => import('./LifiSwapWidget').then((mod) => mod.LifiSwapWidget),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
      </div>
    ),
  }
);

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwapComplete?: () => void;
  sourceType?: WidgetSourceType;
  title?: string;
  subtitle?: string;
}

export function SwapModal({ 
  isOpen, 
  onClose, 
  onSwapComplete,
  sourceType = 'any',
  title,
  subtitle,
}: SwapModalProps) {
  const [swapStatus, setSwapStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const handleSwapComplete = useCallback((route: Route) => {
    console.log('[SwapModal] Swap completed:', route);
    setSwapStatus('success');
    
    // Notify parent and close after delay
    if (onSwapComplete) {
      setTimeout(() => {
        onSwapComplete();
        onClose();
        setSwapStatus('idle');
      }, 2000);
    }
  }, [onSwapComplete, onClose]);

  const handleSwapFailed = useCallback((update: RouteExecutionUpdate) => {
    console.error('[SwapModal] Swap failed:', update);
    setSwapStatus('failed');
    
    // Reset status after showing error
    setTimeout(() => setSwapStatus('idle'), 3000);
  }, []);

  // Dynamic title/subtitle based on source type
  const getHeader = () => {
    if (title) return { title, subtitle: subtitle || '' };
    
    switch (sourceType) {
      case 'btc':
        return { title: 'Fund with BTC', subtitle: 'Bitcoin → Hyperliquid USDC' };
      case 'arbitrum':
        return { title: 'Bridge USDC', subtitle: 'Arbitrum → Hyperliquid' };
      default:
        return { title: 'Fund Account', subtitle: 'Any asset → Hyperliquid USDC' };
    }
  };

  const header = getHeader();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-dark-800 rounded-t-2xl px-4 py-3 flex items-center justify-between border-b border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-white">{header.title}</h2>
            <p className="text-xs text-gray-400">{header.subtitle}</p>
          </div>
          <button
            onClick={onClose}
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
              Swap completed! Balance updated.
            </span>
          </div>
        )}
        
        {swapStatus === 'failed' && (
          <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-red-400 text-sm font-medium">
              Swap failed. Please try again.
            </span>
          </div>
        )}

        {/* Widget Container */}
        <div className="bg-dark-900 rounded-b-2xl overflow-hidden">
          <LifiSwapWidget 
            sourceType={sourceType}
            onSwapComplete={handleSwapComplete}
            onSwapFailed={handleSwapFailed}
          />
        </div>
      </div>
    </div>
  );
}
