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
const HYPERLIQUID_CHAIN_ID = 1337;

// Token addresses
const BTC_TOKEN = 'bitcoin';
const ARBITRUM_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const HYPERLIQUID_USDC = '0x6d1e7cde53bA9467B783Cb7c530CE05400000000';

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
      
      // Credit the vault with the received USDC amount
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
        // Hyperliquid USDC has 8 decimals
        const amountUsdc = parseFloat(route.toAmountMin) / 1e8;
        
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

  // Configure based on source type
  const getChainConfig = () => {
    switch (sourceType) {
      case 'btc':
        return {
          fromChain: BTC_CHAIN_ID,
          fromToken: BTC_TOKEN,
          allowedChains: [BTC_CHAIN_ID, HYPERLIQUID_CHAIN_ID],
          allowedTokens: [
            { chainId: BTC_CHAIN_ID, address: BTC_TOKEN },
            { chainId: HYPERLIQUID_CHAIN_ID, address: HYPERLIQUID_USDC },
          ],
        };
      case 'arbitrum':
        return {
          fromChain: ARBITRUM_CHAIN_ID,
          fromToken: ARBITRUM_USDC,
          allowedChains: [ARBITRUM_CHAIN_ID, HYPERLIQUID_CHAIN_ID],
          allowedTokens: [
            { chainId: ARBITRUM_CHAIN_ID, address: ARBITRUM_USDC },
            { chainId: HYPERLIQUID_CHAIN_ID, address: HYPERLIQUID_USDC },
          ],
        };
      default: // 'any' - allow BTC, Arbitrum, and other common chains
        return {
          fromChain: BTC_CHAIN_ID,
          fromToken: BTC_TOKEN,
          allowedChains: [BTC_CHAIN_ID, ARBITRUM_CHAIN_ID, 1, HYPERLIQUID_CHAIN_ID], // BTC, Arbitrum, Ethereum, Hyperliquid
          allowedTokens: [
            { chainId: BTC_CHAIN_ID, address: BTC_TOKEN },
            { chainId: ARBITRUM_CHAIN_ID, address: ARBITRUM_USDC },
            { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' }, // ETH USDC
            { chainId: HYPERLIQUID_CHAIN_ID, address: HYPERLIQUID_USDC },
          ],
        };
    }
  };

  const chainConfig = getChainConfig();

  const widgetConfig: Partial<WidgetConfig> = {
    // API Key for authenticated requests (avoids rate limits)
    apiKey: LIFI_API_KEY,
    
    // Pre-configure source and destination
    fromChain: chainConfig.fromChain,
    toChain: HYPERLIQUID_CHAIN_ID,
    fromToken: chainConfig.fromToken,
    toToken: HYPERLIQUID_USDC,
    
    // Default amount - 0.0001 BTC
    fromAmount: defaultAmount || '0.0001',
    
    // Appearance settings
    appearance: 'dark',
    hiddenUI: ['appearance', 'language', 'poweredBy'],
    
    // Chain restrictions
    chains: {
      allow: chainConfig.allowedChains,
    },
    
    // Token restrictions  
    tokens: {
      allow: chainConfig.allowedTokens,
    },
    
    // Slippage settings
    slippage: 0.005, // 0.5% default slippage
    
    // Theme customization to match HypeSwipe dark theme
    theme: {
      container: {
        border: '1px solid #2a2d36',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      palette: {
        primary: { main: '#f7931a' }, // Bitcoin orange
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
    
    // Widget variant
    variant: 'compact',
    
    // Wallet configuration
    // - EVM: Uses wagmi/MetaMask (connected externally)
    // - BTC: Widget shows "Connect BTC Wallet" for Xverse/other BTC wallets
    walletConfig: {
      // Use partial management - EVM wallets from wagmi, BTC wallets from widget
      usePartialWalletManagement: true,
    },
    
    // Bridge settings - allow all for best routing
    bridges: {
      allow: ['relay', 'chainflip', 'thorswap', 'symbiosis'],
    },
    
    // Show route details and build explorer URLs
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
