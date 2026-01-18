'use client';

import { useEffect, useCallback } from 'react';
import type { Route } from '@lifi/sdk';
import type { WidgetConfig, RouteExecutionUpdate } from '@lifi/widget';
import { LiFiWidget, useWidgetEvents, WidgetEvent } from '@lifi/widget';
import { useAccount } from 'wagmi';

// Li.Fi API Key for authenticated requests (avoids rate limits)
const LIFI_API_KEY = process.env.NEXT_PUBLIC_LIFI_API_KEY || '86b53fc5-b71d-4a5a-abab-401aa1e3055a.21a51524-4553-4fa1-8241-215e46233857';

// Chain IDs
const BTC_CHAIN_ID = 20000000000001; // Li.Fi's BTC chain ID
const ARBITRUM_CHAIN_ID = 42161;
const HYPERLIQUID_CHAIN_ID = 1337; // Hyperliquid L1 (perps/spot) chain ID

// Token addresses
const BTC_TOKEN = 'bitcoin';
const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Native USDC on Arbitrum
const HYPERLIQUID_USDC_PERPS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // USDC (Perps) on Hyperliquid - 6 decimals

export type WidgetSourceType = 'btc' | 'arbitrum' | 'any';

interface LifiSwapWidgetProps {
  sourceType?: WidgetSourceType;
  defaultAmount?: string;
  onSwapComplete?: (route: Route) => void;
  onSwapFailed?: (update: RouteExecutionUpdate) => void;
}

// Event listener component - must be outside the main widget component
function WidgetEventHandler({ 
  onSwapComplete, 
  onSwapFailed 
}: LifiSwapWidgetProps) {
  const widgetEvents = useWidgetEvents();

  useEffect(() => {
    const onRouteExecutionStarted = (route: Route) => {
      console.log('[LiFi] Route execution started:', route.id);
    };

    const onRouteExecutionUpdated = (update: RouteExecutionUpdate) => {
      console.log('[LiFi] Route execution updated:', update.route.id, update.process);
    };

    const onRouteExecutionCompleted = (route: Route) => {
      console.log('[LiFi] Route execution completed:', route.id);
      console.log('[LiFi] Received amount:', route.toAmountMin);
      
      if (onSwapComplete) {
        onSwapComplete(route);
      }
    };

    const onRouteExecutionFailed = (update: RouteExecutionUpdate) => {
      console.error('[LiFi] Route execution failed:', update.route.id, update.process);
      if (onSwapFailed) {
        onSwapFailed(update);
      }
    };

    widgetEvents.on(WidgetEvent.RouteExecutionStarted, onRouteExecutionStarted);
    widgetEvents.on(WidgetEvent.RouteExecutionUpdated, onRouteExecutionUpdated);
    widgetEvents.on(WidgetEvent.RouteExecutionCompleted, onRouteExecutionCompleted);
    widgetEvents.on(WidgetEvent.RouteExecutionFailed, onRouteExecutionFailed);

    return () => widgetEvents.all.clear();
  }, [widgetEvents, onSwapComplete, onSwapFailed]);

  return null;
}

export function LifiSwapWidget({ 
  sourceType = 'any', 
  defaultAmount,
  onSwapComplete, 
  onSwapFailed 
}: LifiSwapWidgetProps) {
  const { address } = useAccount();

  const handleSwapComplete = useCallback(async (route: Route) => {
    // Credit vault with the received USDC
    if (address && route.toAmountMin) {
      try {
        // Hyperliquid USDC (Perps) has 6 decimals
        const amountUsdc = parseFloat(route.toAmountMin) / 1e6;
        
        const response = await fetch('/api/vault/credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: address,
            amountUsdc: amountUsdc,
          }),
        });

        if (response.ok) {
          console.log('[LiFi] Vault credited with', amountUsdc, 'USDC');
        }
      } catch (error) {
        console.error('[LiFi] Failed to credit vault:', error);
      }
    }

    if (onSwapComplete) {
      onSwapComplete(route);
    }
  }, [address, onSwapComplete]);

  // Get default chain/token based on source type
  const getDefaults = () => {
    switch (sourceType) {
      case 'btc':
        return {
          fromChain: BTC_CHAIN_ID,
          fromToken: BTC_TOKEN,
          fromAmount: defaultAmount ? parseFloat(defaultAmount) : 0.0001,
        };
      case 'arbitrum':
        return {
          fromChain: ARBITRUM_CHAIN_ID,
          fromToken: ARBITRUM_USDC,
          fromAmount: defaultAmount ? parseFloat(defaultAmount) : 10, // 10 USDC default
        };
      default:
        return {
          fromChain: undefined, // Let user choose
          fromToken: undefined,
          fromAmount: defaultAmount ? parseFloat(defaultAmount) : 10,
        };
    }
  };

  const defaults = getDefaults();

  // Widget configuration - simplified per Li.Fi docs
  // https://docs.li.fi/widget/configure-widget
  const widgetConfig: Partial<WidgetConfig> = {
    // API Key for authenticated requests
    apiKey: LIFI_API_KEY,
    
    // Pre-select source chain/token (if specified)
    ...(defaults.fromChain && { fromChain: defaults.fromChain }),
    ...(defaults.fromToken && { fromToken: defaults.fromToken }),
    fromAmount: defaults.fromAmount,
    
    // Pre-select destination: Hyperliquid L1 Perps
    toChain: HYPERLIQUID_CHAIN_ID,
    toToken: HYPERLIQUID_USDC_PERPS,
    
    // Appearance
    appearance: 'dark',
    variant: 'compact',
    
    // Hide certain UI elements
    hiddenUI: ['appearance', 'language', 'poweredBy'],
    
    // Slippage setting
    slippage: 0.005, // 0.5%
    
    // Theme customization
    theme: {
      container: {
        border: '1px solid #2a2d36',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      palette: {
        primary: { main: '#f7931a' },
        secondary: { main: '#3b82f6' },
        background: {
          paper: '#1a1d24',
          default: '#0f1116',
        },
      },
      shape: {
        borderRadius: 12,
        borderRadiusSecondary: 8,
      },
    },
    
    // Wallet config - use external wagmi for EVM, widget handles BTC
    walletConfig: {
      usePartialWalletManagement: true,
    },
    
    // Enable URL building for tracking
    buildUrl: true,
  };

  return (
    <div className="lifi-widget-container">
      <WidgetEventHandler 
        onSwapComplete={handleSwapComplete} 
        onSwapFailed={onSwapFailed} 
      />
      <LiFiWidget integrator="HypeSwipe" config={widgetConfig} />
    </div>
  );
}
