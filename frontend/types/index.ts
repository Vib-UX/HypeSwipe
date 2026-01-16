// ============================================
// Vault Types
// ============================================

export interface VaultState {
  userAddress: string; // EVM address (lowercased)
  equityUsdc: number; // total USDC credited from Li.Fi swaps
}

export interface VaultResponse {
  equityUsdc: number;
}

export interface VaultCreditRequest {
  address: string;
  amountUsdc: number;
}

// ============================================
// Li.Fi Types (based on their API responses)
// ============================================

export interface LifiChain {
  id: number;
  key: string;
  chainType: string;
  name: string;
  coin: string;
  mainnet: boolean;
  logoURI?: string;
  metamask?: {
    chainId: string;
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls: string[];
  };
}

export interface LifiToken {
  address: string;
  chainId: number;
  symbol: string;
  decimals: number;
  name: string;
  coinKey?: string;
  priceUSD?: string;
  logoURI?: string;
}

export interface LifiTool {
  key: string;
  name: string;
  logoURI?: string;
  supportedChains: number[];
}

export interface LifiTransactionRequest {
  to: string; // BTC vault address to send funds to
  value: string; // Amount in satoshis
  data: string; // Memo/PSBT data for the bridge
  from?: string;
  chainId?: number;
  gasLimit?: string;
  gasPrice?: string;
}

export interface LifiAction {
  fromToken: LifiToken;
  toToken: LifiToken;
  fromChainId: number;
  toChainId: number;
  fromAmount: string;
  slippage: number;
  fromAddress: string;
  toAddress: string;
}

export interface LifiEstimate {
  tool: string;
  fromAmount: string;
  fromAmountUSD?: string;
  toAmount: string;
  toAmountMin: string;
  toAmountUSD?: string;
  approvalAddress?: string;
  executionDuration: number;
  feeCosts?: Array<{
    name: string;
    description?: string;
    token: LifiToken;
    amount: string;
    amountUSD?: string;
    percentage?: string;
    included: boolean;
  }>;
  gasCosts?: Array<{
    type: string;
    price?: string;
    estimate?: string;
    limit?: string;
    amount: string;
    amountUSD?: string;
    token: LifiToken;
  }>;
}

export interface LifiStep {
  id: string;
  type: string;
  tool: string;
  toolDetails: {
    key: string;
    name: string;
    logoURI?: string;
  };
  action: LifiAction;
  estimate: LifiEstimate;
}

export interface LifiQuoteResponse {
  id: string;
  type: string;
  tool: string;
  toolDetails: {
    key: string;
    name: string;
    logoURI?: string;
  };
  action: LifiAction;
  estimate: LifiEstimate;
  includedSteps?: LifiStep[];
  transactionRequest: LifiTransactionRequest;
}

export interface LifiQuoteRequest {
  btcAddress: string;
  evmAddress: string;
  fromAmountSats: string;
  toChainId: number;
  slippage?: number; // Slippage tolerance as decimal (e.g., 0.01 = 1%). Default: 0.01
  toToken: string;
}

export interface LifiStatusResponse {
  transactionId: string;
  sending: {
    txHash?: string;
    txLink?: string;
    amount?: string;
    token?: LifiToken;
    chainId?: number;
    gasPrice?: string;
    gasUsed?: string;
    gasToken?: LifiToken;
    gasAmount?: string;
    gasAmountUSD?: string;
  };
  receiving: {
    txHash?: string;
    txLink?: string;
    amount?: string;
    token?: LifiToken;
    chainId?: number;
  };
  lifiExplorerLink?: string;
  fromAddress?: string;
  toAddress?: string;
  tool?: string;
  status: 'NOT_FOUND' | 'INVALID' | 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  substatusMessage?: string;
}

// ============================================
// App State Types
// ============================================

export interface UserState {
  evmAddress: string | null;
  btcAddress: string | null;
  isConnected: boolean;
}

export interface TopUpModalState {
  isOpen: boolean;
  btcAmount: string;
  targetChainId: number;
  quote: LifiQuoteResponse | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Constants
// ============================================

export const BTC_CHAIN_ID = 20000000000001;
export const BTC_CHAIN_KEY = 'BTC';

export const SUPPORTED_EVM_CHAINS = [
  { id: 1, name: 'Ethereum', usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 42161, name: 'Arbitrum', usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
] as const;

// Native token address (used for ETH on EVM chains)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// Placeholder BTC price for display purposes
export const BTC_PRICE_USD = 50000;

// Sats per BTC
export const SATS_PER_BTC = 100_000_000;
