'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUserStore } from '@/store/userStore';
import { useBtcToUsdcQuote } from '@/hooks/useLifi';
import { useBtcTransaction } from '@/hooks/useBtcTransaction';
import { SUPPORTED_EVM_CHAINS, SATS_PER_BTC, BTC_PRICE_USD } from '@/types';
import type { LifiQuoteResponse } from '@/types';
import { satsToBtc } from '@/lib/lifi';
import { getBtcAddressInfo, formatBtcDisplay } from '@/lib/btc';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Minimum BTC amount for quotes
const MIN_BTC_AMOUNT = 0.0001;

// Error type for better handling
interface QuoteError {
  type: 'insufficient_balance' | 'rate_limit' | 'no_route' | 'generic';
  message: string;
  suggestion?: string;
  balance?: number;
  required?: number;
}

/**
 * Parse error from Li.Fi API response to provide user-friendly messages
 */
function parseQuoteError(error: Error): QuoteError {
  const message = error.message.toLowerCase();
  
  // Rate limit error (429)
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      suggestion: 'Please wait a moment and try again. The bridge API is temporarily busy.',
    };
  }
  
  // No route found (404 or specific message)
  if (
    message.includes('404') || 
    message.includes('no available quotes') || 
    message.includes('no route') ||
    message.includes('no possible route')
  ) {
    return {
      type: 'no_route',
      message: 'No route available for this trade',
      suggestion: 'Try adjusting the amount, increasing slippage, or selecting a different destination chain.',
    };
  }
  
  // Insufficient funds
  if (message.includes('funds') || message.includes('balance') || message.includes('utxo')) {
    return {
      type: 'insufficient_balance',
      message: 'Insufficient BTC balance',
      suggestion: 'Your BTC address does not have enough funds for this transaction.',
    };
  }
  
  // Slippage related
  if (message.includes('slippage')) {
    return {
      type: 'no_route',
      message: 'Slippage tolerance too low',
      suggestion: 'Try increasing slippage to 3% or higher for BTC bridges.',
    };
  }
  
  // Generic error
  return {
    type: 'generic',
    message: error.message || 'Failed to get quote',
    suggestion: 'Please try again or contact support if the issue persists.',
  };
}

export function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const { address: evmAddress } = useAccount();
  const { btcAddress } = useUserStore();
  
  const [btcAmount, setBtcAmount] = useState('0.01');
  const [selectedChainId, setSelectedChainId] = useState<number>(SUPPORTED_EVM_CHAINS[1].id);
  const [slippage, setSlippage] = useState(0.02); // Default 2% for BTC bridges
  const [quote, setQuote] = useState<LifiQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<QuoteError | null>(null);
  
  // Balance state
  const [btcBalance, setBtcBalance] = useState<number | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balanceWarning, setBalanceWarning] = useState<string | null>(null);
  
  const quoteMutation = useBtcToUsdcQuote();
  const btcTx = useBtcTransaction();
  
  // Store reset function in ref to avoid dependency issues
  const btcTxResetRef = useRef(btcTx.reset);
  btcTxResetRef.current = btcTx.reset;

  const selectedChain = SUPPORTED_EVM_CHAINS.find(c => c.id === selectedChainId);

  // Check balance when modal opens or BTC address changes
  useEffect(() => {
    if (isOpen && btcAddress) {
      checkBalance();
    }
  }, [isOpen, btcAddress]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuote(null);
      setQuoteError(null);
      setBalanceWarning(null);
      btcTxResetRef.current();
    }
  }, [isOpen]);

  // Check balance and update warning when amount changes
  useEffect(() => {
    if (btcBalance !== null && btcAmount) {
      const requiredSats = Math.floor(parseFloat(btcAmount || '0') * SATS_PER_BTC);
      if (requiredSats > btcBalance) {
        setBalanceWarning(`Insufficient balance. You have ${formatBtcDisplay(btcBalance)} but need ${formatBtcDisplay(requiredSats)}`);
      } else {
        setBalanceWarning(null);
      }
    }
  }, [btcAmount, btcBalance]);

  const checkBalance = async () => {
    if (!btcAddress) return;
    
    setIsCheckingBalance(true);
    try {
      const info = await getBtcAddressInfo(btcAddress);
      setBtcBalance(info.balance);
    } catch (error) {
      console.error('Failed to check balance:', error);
      // Don't block the user if balance check fails
      setBtcBalance(null);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Clear quote when inputs change
  const handleInputChange = () => {
    setQuote(null);
    setQuoteError(null);
  };

  // Manual quote fetch with balance check
  const handleGetQuote = async () => {
    if (!btcAddress || !evmAddress) return;
    
    const amount = parseFloat(btcAmount);
    if (isNaN(amount) || amount < MIN_BTC_AMOUNT) {
      setQuoteError({
        type: 'generic',
        message: `Minimum amount is ${MIN_BTC_AMOUNT} BTC`,
      });
      return;
    }
    
    const requiredSats = Math.floor(amount * SATS_PER_BTC);
    
    // Check balance first if we have it
    if (btcBalance !== null && requiredSats > btcBalance) {
      setQuoteError({
        type: 'insufficient_balance',
        message: 'Insufficient BTC balance',
        suggestion: `You have ${formatBtcDisplay(btcBalance)} but need approximately ${formatBtcDisplay(requiredSats + 1000)} (including fees).`,
        balance: btcBalance,
        required: requiredSats,
      });
      return;
    }
    
    const amountSats = requiredSats.toString();
    const usdcAddress = selectedChain?.usdcAddress || '0x0000000000000000000000000000000000000000';
    
    setQuoteError(null);
    setQuote(null);
    
    try {
      const result = await quoteMutation.mutateAsync({
        btcAddress,
        evmAddress,
        fromAmountSats: amountSats,
        toChainId: selectedChainId,
        toToken: usdcAddress,
        slippage,
      });
      setQuote(result);
    } catch (error) {
      console.error('Quote error:', error);
      const parsedError = parseQuoteError(error instanceof Error ? error : new Error('Unknown error'));
      setQuoteError(parsedError);
    }
  };

  if (!isOpen) return null;

  const handleSendBtc = async () => {
    if (!quote || !btcAddress) return;
    
    try {
      const txHash = await btcTx.sendTransaction({ quote, btcAddress });
      console.log('BTC Transaction sent:', txHash);
      
      // TODO: Start polling Li.Fi status API to track the bridge
      // For now, just show success and close after delay
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Send BTC error:', error);
    }
  };

  // Get USDC decimals for the selected chain (Hyperliquid uses 8, others use 6)
  const usdcDecimals = selectedChain?.usdcDecimals || 6;
  const usdcDivisor = Math.pow(10, usdcDecimals);
  
  const estimatedUsdc = quote 
    ? parseFloat(quote.estimate.toAmount) / usdcDivisor 
    : parseFloat(btcAmount || '0') * BTC_PRICE_USD;

  const hasInsufficientBalance = btcBalance !== null && 
    Math.floor(parseFloat(btcAmount || '0') * SATS_PER_BTC) > btcBalance;
  
  const canGetQuote = btcAddress && evmAddress && 
    parseFloat(btcAmount || '0') >= MIN_BTC_AMOUNT && 
    !quoteMutation.isPending && 
    !btcTx.isLoading &&
    !hasInsufficientBalance;
    
  const canSend = quote && btcAddress && !btcTx.isLoading && !quoteMutation.isPending;
  const isLoadingQuote = quoteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Top Up with BTC</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!btcAddress ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">
              Please set up your BTC address first to use this feature.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance Display */}
            <div className="p-3 bg-dark-800/50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-gray-400">Available Balance</span>
              <span className="text-sm font-medium">
                {isCheckingBalance ? (
                  <span className="text-gray-500">Checking...</span>
                ) : btcBalance !== null ? (
                  <span className={btcBalance === 0 ? 'text-yellow-400' : 'text-white'}>
                    {formatBtcDisplay(btcBalance)}
                  </span>
                ) : (
                  <button 
                    onClick={checkBalance}
                    className="text-primary-400 hover:text-primary-300 text-xs"
                  >
                    Check balance
                  </button>
                )}
              </span>
            </div>

            {/* Zero Balance Warning */}
            {btcBalance === 0 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-400 text-sm font-medium">No BTC balance detected</p>
                <p className="text-yellow-300/70 text-xs mt-1">
                  Send BTC to your address first, then return here to top up.
                </p>
              </div>
            )}

            {/* BTC Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (BTC)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={btcAmount}
                onChange={(e) => {
                  setBtcAmount(e.target.value);
                  handleInputChange();
                }}
                className={`w-full px-4 py-3 bg-dark-800 border rounded-lg focus:outline-none text-white text-lg ${
                  hasInsufficientBalance 
                    ? 'border-red-500 focus:border-red-400' 
                    : 'border-dark-600 focus:border-primary-500'
                }`}
                disabled={btcTx.isLoading}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  ≈ ${(parseFloat(btcAmount || '0') * BTC_PRICE_USD).toLocaleString()} USD
                </p>
                {btcBalance !== null && btcBalance > 0 && (
                  <button
                    onClick={() => {
                      // Set max amount (balance minus ~2000 sats for fees)
                      const maxSats = Math.max(0, btcBalance - 2000);
                      setBtcAmount((maxSats / SATS_PER_BTC).toFixed(8));
                      handleInputChange();
                    }}
                    className="text-xs text-primary-400 hover:text-primary-300"
                  >
                    MAX
                  </button>
                )}
              </div>
              {/* Insufficient Balance Warning */}
              {balanceWarning && (
                <p className="text-xs text-red-400 mt-1">{balanceWarning}</p>
              )}
            </div>

            {/* Target Chain Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination Chain
              </label>
              <select
                value={selectedChainId}
                onChange={(e) => {
                  setSelectedChainId(Number(e.target.value));
                  handleInputChange();
                }}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-white"
                disabled={btcTx.isLoading}
              >
                {SUPPORTED_EVM_CHAINS.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Slippage Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Slippage Tolerance
              </label>
              <div className="flex gap-2">
                {[
                  { value: 0.01, label: '1%' },
                  { value: 0.02, label: '2%' },
                  { value: 0.03, label: '3%' },
                  { value: 0.05, label: '5%' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSlippage(option.value);
                      handleInputChange();
                    }}
                    disabled={btcTx.isLoading}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slippage === option.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    } disabled:opacity-50`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Get Quote Button */}
            {!quote && (
              <button
                onClick={handleGetQuote}
                disabled={!canGetQuote}
                className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:text-gray-500 rounded-lg font-medium transition-colors"
              >
                {isLoadingQuote ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Getting Quote...
                  </span>
                ) : hasInsufficientBalance ? (
                  'Insufficient Balance'
                ) : (
                  'Get Quote'
                )}
              </button>
            )}

            {/* Quote Error */}
            {quoteError && !isLoadingQuote && (
              <div className={`p-4 rounded-lg border ${
                quoteError.type === 'rate_limit' 
                  ? 'bg-yellow-900/20 border-yellow-700' 
                  : quoteError.type === 'insufficient_balance'
                  ? 'bg-red-900/20 border-red-700'
                  : 'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex items-start gap-2">
                  {quoteError.type === 'rate_limit' ? (
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      quoteError.type === 'rate_limit' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {quoteError.message}
                    </p>
                    {quoteError.suggestion && (
                      <p className={`text-xs mt-1 ${
                        quoteError.type === 'rate_limit' ? 'text-yellow-300/70' : 'text-red-300/70'
                      }`}>
                        {quoteError.suggestion}
                      </p>
                    )}
                  </div>
                </div>
                {quoteError.type === 'rate_limit' && (
                  <button
                    onClick={handleGetQuote}
                    className="mt-3 w-full px-3 py-2 bg-yellow-700/30 hover:bg-yellow-700/50 text-yellow-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Quote Display */}
            {quote && !isLoadingQuote && (
              <div className="space-y-3 pt-2">
                {/* Estimated Output */}
                <div className="p-4 bg-dark-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">You&apos;ll receive</p>
                      <p className="text-2xl font-bold text-primary-400">
                        ${estimatedUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">USDC on {selectedChain?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">via {quote.tool}</p>
                      <p className="text-xs text-gray-500">
                        ~{Math.ceil(quote.estimate.executionDuration / 60)} min
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transaction Details (collapsed) */}
                <details className="group">
                  <summary className="text-sm text-primary-400 hover:text-primary-300 cursor-pointer flex items-center gap-1">
                    <span>Transaction details</span>
                    <svg className="w-4 h-4 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-2 p-3 bg-dark-950 rounded-lg text-xs font-mono space-y-1 text-gray-400">
                    <p>Send: {satsToBtc(quote.transactionRequest.value)} BTC</p>
                    <p className="break-all">To: {quote.transactionRequest.to}</p>
                    <p>Bridge: {quote.tool}</p>
                    <p>Min output: ${(parseFloat(quote.estimate.toAmountMin) / usdcDivisor).toFixed(2)} USDC</p>
                  </div>
                </details>

                {/* New Quote Button */}
                <button
                  onClick={() => {
                    setQuote(null);
                    setQuoteError(null);
                  }}
                  className="text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  Get new quote
                </button>
              </div>
            )}

            {/* Transaction Status */}
            {btcTx.status !== 'idle' && (
              <div className={`p-4 rounded-lg ${
                btcTx.status === 'error' 
                  ? 'bg-red-900/20 border border-red-700' 
                  : btcTx.status === 'success'
                  ? 'bg-green-900/20 border border-green-700'
                  : 'bg-primary-900/20 border border-primary-700'
              }`}>
                {btcTx.status === 'signing' && (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-primary-400">Please sign the transaction in your wallet...</span>
                  </div>
                )}
                {btcTx.status === 'broadcasting' && (
                  <p className="text-primary-400">Broadcasting transaction...</p>
                )}
                {btcTx.status === 'success' && (
                  <div>
                    <p className="text-green-400 font-medium">Transaction sent!</p>
                    {btcTx.txHash && (
                      <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                        TX: {btcTx.txHash}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Bridge in progress. USDC will arrive in ~{quote ? Math.ceil(quote.estimate.executionDuration / 60) : 10} minutes.
                    </p>
                  </div>
                )}
                {btcTx.status === 'error' && (
                  <div>
                    <p className="text-red-400 font-medium">Transaction failed</p>
                    <p className="text-xs text-red-300/70 mt-1">{btcTx.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Send Button - only show when quote is available */}
            {quote && (
              <button
                onClick={handleSendBtc}
                disabled={!canSend}
                className={`w-full px-4 py-4 rounded-lg font-semibold text-lg transition-all ${
                  canSend
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/25'
                    : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {btcTx.isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Send ${satsToBtc(quote.transactionRequest.value)} BTC`
                )}
              </button>
            )}

            {/* Info Text */}
            {quote && btcTx.status === 'idle' && (
              <p className="text-xs text-gray-500 text-center">
                Your wallet will prompt you to sign the Bitcoin transaction
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
