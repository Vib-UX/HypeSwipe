'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useUserStore } from '@/store/userStore';
import { useBtcToUsdcQuote } from '@/hooks/useLifi';
import { useCreditVault } from '@/hooks/useVault';
import { SUPPORTED_EVM_CHAINS, SATS_PER_BTC, BTC_PRICE_USD } from '@/types';
import type { LifiQuoteResponse } from '@/types';
import { satsToBtc, decodePsbt, type ParsedPsbtData } from '@/lib/lifi';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
  const { address: evmAddress } = useAccount();
  const { btcAddress } = useUserStore();
  
  const [btcAmount, setBtcAmount] = useState('0.01');
  const [selectedChainId, setSelectedChainId] = useState<number>(SUPPORTED_EVM_CHAINS[1].id); // Default to Arbitrum
  const [slippage, setSlippage] = useState(0.01); // Default 1% for BTC bridges
  const [quote, setQuote] = useState<LifiQuoteResponse | null>(null);
  const [decodedPsbt, setDecodedPsbt] = useState<ParsedPsbtData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Slippage options
  const SLIPPAGE_OPTIONS = [
    { value: 0.005, label: '0.5%' },
    { value: 0.01, label: '1%' },
    { value: 0.02, label: '2%' },
    { value: 0.03, label: '3%' },
  ];
  
  const quoteMutation = useBtcToUsdcQuote();
  const creditMutation = useCreditVault();

  if (!isOpen) return null;

  const selectedChain = SUPPORTED_EVM_CHAINS.find(c => c.id === selectedChainId);
  
  const handleGetQuote = async () => {
    if (!btcAddress || !evmAddress) return;
    
    const amountSats = Math.floor(parseFloat(btcAmount) * SATS_PER_BTC).toString();
    
    try {
      const result = await quoteMutation.mutateAsync({
        btcAddress,
        evmAddress,
        fromAmountSats: amountSats,
        toChainId: selectedChainId,
        toToken: selectedChain?.usdcAddress || '0x0000000000000000000000000000000000000000',
        slippage: slippage,
      });
      setQuote(result);
      
      // Decode PSBT if present in transactionRequest.data
      if (result.transactionRequest?.data) {
        try {
          const decoded = decodePsbt(result.transactionRequest.data);
          setDecodedPsbt(decoded);
        } catch (e) {
          console.warn('Could not decode PSBT:', e);
          setDecodedPsbt(null);
        }
      }
    } catch (error) {
      console.error('Quote error:', error);
    }
  };

  const handleSimulateDeposit = async () => {
    if (!evmAddress || !quote) return;
    
    // Get the estimated USDC amount from the quote
    // toAmount is in the token's smallest unit (6 decimals for USDC)
    const toAmountUsdc = parseFloat(quote.estimate.toAmount) / 1_000_000;
    
    /**
     * PRODUCTION IMPLEMENTATION:
     * =========================
     * 
     * In a real implementation, this flow would be:
     * 
     * 1. Prompt user to sign BTC transaction in MetaMask
     *    - Use the transactionRequest data from the quote
     *    - transactionRequest.to = BTC vault address
     *    - transactionRequest.value = amount in sats
     *    - transactionRequest.data = memo for bridge routing
     * 
     * 2. Broadcast signed BTC transaction to the network
     * 
     * 3. Get the BTC txHash and call backend endpoint to track:
     *    POST /api/lifi/track-deposit { txHash, fromChain: 'BTC', toChain: selectedChainId }
     * 
     * 4. Backend polls Li.Fi status endpoint:
     *    GET https://li.quest/v1/status?txHash=<btcTxHash>&fromChain=BTC&toChain=<evmChainId>
     *    
     *    Response statuses:
     *    - NOT_FOUND: Transaction not yet indexed
     *    - PENDING: Transaction in progress
     *    - DONE: Transfer complete
     *    - FAILED: Transfer failed
     * 
     * 5. Only when status === 'DONE':
     *    - Get actual received amount from status.receiving.amount
     *    - Credit vault with that amount
     *    - Notify user of completion
     * 
     * For this MVP, we simulate success immediately:
     */
    
    try {
      await creditMutation.mutateAsync({
        address: evmAddress,
        amountUsdc: toAmountUsdc,
      });
      
      // Close modal after successful credit
      setQuote(null);
      onClose();
    } catch (error) {
      console.error('Credit error:', error);
    }
  };

  const estimatedUsdc = quote 
    ? parseFloat(quote.estimate.toAmount) / 1_000_000 
    : parseFloat(btcAmount) * BTC_PRICE_USD;

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
                  setQuote(null);
                  setDecodedPsbt(null);
                }}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-white text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                ≈ ${(parseFloat(btcAmount || '0') * BTC_PRICE_USD).toLocaleString()} USD (estimated)
              </p>
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
                  setQuote(null);
                  setDecodedPsbt(null);
                }}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-white"
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
                {SLIPPAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSlippage(option.value);
                      setQuote(null);
                      setDecodedPsbt(null);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slippage === option.value
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                BTC bridges need higher slippage due to longer confirmation times
              </p>
            </div>

            {/* Get Quote Button */}
            <button
              onClick={handleGetQuote}
              disabled={quoteMutation.isPending || !btcAmount || parseFloat(btcAmount) <= 0}
              className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 disabled:bg-dark-800 disabled:text-gray-500 rounded-lg font-medium transition-colors"
            >
              {quoteMutation.isPending ? 'Getting Quote...' : 'Get Quote'}
            </button>

            {/* Error Display */}
            {quoteMutation.isError && (
              <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg space-y-2">
                <p className="text-red-400 text-sm font-medium">
                  {quoteMutation.error instanceof Error ? quoteMutation.error.message : 'Failed to get quote'}
                </p>
                {quoteMutation.error instanceof Error && quoteMutation.error.message.includes('slippage') && (
                  <p className="text-red-300/70 text-xs">
                    Try increasing slippage tolerance above (2% or 3%)
                  </p>
                )}
                {quoteMutation.error instanceof Error && quoteMutation.error.message.includes('funds') && (
                  <p className="text-red-300/70 text-xs">
                    Your BTC address needs UTXOs (unspent outputs) to create a quote. 
                    Make sure the address has received BTC and has available balance.
                  </p>
                )}
                {quoteMutation.error instanceof Error && quoteMutation.error.message.includes('No available quotes') && (
                  <p className="text-red-300/70 text-xs">
                    No bridge routes available. Try: increasing amount, changing slippage, or trying later.
                  </p>
                )}
              </div>
            )}

            {/* Quote Display */}
            {quote && (
              <div className="space-y-4 pt-4 border-t border-dark-700">
                <h3 className="font-medium text-gray-200">Quote Details</h3>
                
                <div className="space-y-3">
                  {/* Estimated Output */}
                  <div className="p-4 bg-dark-800 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Estimated USDC on trading side</p>
                    <p className="text-2xl font-bold text-primary-400">
                      ${estimatedUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Transaction Info */}
                  <div className="p-4 bg-dark-800 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Send to vault:</span>
                      <span className="text-gray-200 font-mono text-xs">
                        {quote.transactionRequest.to.slice(0, 12)}...{quote.transactionRequest.to.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-gray-200">
                        {satsToBtc(quote.transactionRequest.value)} BTC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Route:</span>
                      <span className="text-gray-200">{quote.tool}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Est. time:</span>
                      <span className="text-gray-200">
                        ~{Math.ceil(quote.estimate.executionDuration / 60)} min
                      </span>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                  >
                    {showDetails ? 'Hide' : 'Show'} technical details
                    <svg 
                      className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showDetails && (
                    <div className="p-4 bg-dark-950 rounded-lg text-xs font-mono space-y-3 text-gray-400">
                      <div>
                        <p className="text-gray-500 mb-1">Route Info:</p>
                        <p>fromChain: BTC</p>
                        <p>toChain: {selectedChain?.name} ({selectedChainId})</p>
                        <p>fromToken: bitcoin</p>
                        <p>toToken: USDC</p>
                        <p>bridge: {quote.tool}</p>
                      </div>
                      
                      {decodedPsbt && (
                        <div className="pt-3 border-t border-dark-700">
                          <p className="text-gray-500 mb-1">Decoded PSBT:</p>
                          <p>outputs: {decodedPsbt.outputs.length}</p>
                          <p>deposit: {satsToBtc(decodedPsbt.depositAmount)} BTC</p>
                          {decodedPsbt.refundAmount > 0 && (
                            <p>refund: {satsToBtc(decodedPsbt.refundAmount)} BTC</p>
                          )}
                          {decodedPsbt.memo && (
                            <div className="mt-2">
                              <p className="text-gray-500 mb-1">OP_RETURN Memo:</p>
                              <p className="break-all text-primary-400/80">{decodedPsbt.memo}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!decodedPsbt && quote.transactionRequest.data && (
                        <p className="break-all">raw data: {quote.transactionRequest.data.slice(0, 50)}...</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Simulate Button */}
                <button
                  onClick={handleSimulateDeposit}
                  disabled={creditMutation.isPending}
                  className="w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 rounded-lg font-medium transition-colors"
                >
                  {creditMutation.isPending ? 'Processing...' : 'Simulate Send + Credit'}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  MVP mode: This simulates the deposit without sending real BTC.
                  In production, you would sign a BTC transaction here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
