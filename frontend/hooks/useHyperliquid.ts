import { useMemo } from 'react';
import { useWalletClient } from 'wagmi';
import { HyperliquidSDK } from '@/lib/hyperliquid';

export function useHyperliquid() {
  const { data: walletClient } = useWalletClient();

  const hyperliquid = useMemo(() => {
    if (walletClient) {
      return new HyperliquidSDK(walletClient);
    }
    return new HyperliquidSDK();
  }, [walletClient]);

  return hyperliquid;
}
