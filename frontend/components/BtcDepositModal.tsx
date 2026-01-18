'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUserStore } from '@/store/userStore';
import { useBtcToUsdcQuote } from '@/hooks/useLifi';
import { useBtcAccount } from '@/hooks/useBtcAccount';
import { useBtcTransaction } from '@/hooks/useBtcTransaction';
import { useLightning, LIGHTNING_CONFIG } from '@/hooks/useLightning';
import { SUPPORTED_EVM_CHAINS, SATS_PER_BTC, BTC_PRICE_USD, HYPERLIQUID_CHAIN_ID } from '@/types';
import type { LifiQuoteResponse } from '@/types';
import { satsToBtc } from '@/lib/lifi';
import { getBtcAddressInfo, formatBtcDisplay } from '@/lib/btc';

interface BtcDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DepositMethod = 'select' | 'native' | 'lightning';
type QuoteState = 'idle' | 'loading' | 'success' | 'error';
type LightningStatus = 'idle' | 'creating' | 'paying' | 'verifying' | 'success' | 'error';

// Default to Hyperliquid for trading
const DEFAULT_CHAIN = SUPPORTED_EVM_CHAINS.find(c => c.id === HYPERLIQUID_CHAIN_ID) || SUPPORTED_EVM_CHAINS[0];
const DEFAULT_AMOUNT_BTC = '0.0001';

// Debounce delay for quote fetching
const QUOTE_DEBOUNCE_MS = 800;

export function BtcDepositModal({ isOpen, onClose }: BtcDepositModalProps) {
  const { address: evmAddress } = useAccount();
  const { btcAddress, setBtcAddress } = useUserStore();
  
  // Deposit method selection
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('select');
  
  // Native BTC state
  const [btcAmount, setBtcAmount] = useState(DEFAULT_AMOUNT_BTC);
  const [selectedChainId, setSelectedChainId] = useState<number>(DEFAULT_CHAIN.id);
  const [slippage, setSlippage] = useState(0.03);
  const [quote, setQuote] = useState<LifiQuoteResponse | null>(null);
  const [quoteState, setQuoteState] = useState<QuoteState>('idle');
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [btcBalance, setBtcBalance] = useState<number | null>(null);
  
  // Lightning state
  const [satAmount, setSatAmount] = useState('10000'); // Default 10k sats
  const [lightningStatus, setLightningStatus] = useState<LightningStatus>('idle');
  const [lightningError, setLightningError] = useState<string | null>(null);
  const [lightningTxHash, setLightningTxHash] = useState<string | null>(null);
  
  // Refs for debouncing
  const quoteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastQuoteParamsRef = useRef<string>('');
  
  // Hooks
  const quoteMutation = useBtcToUsdcQuote();
  const btcTx = useBtcTransaction();
  const btcAccount = useBtcAccount();
  const lightning = useLightning();
  
  const selectedChain = SUPPORTED_EVM_CHAINS.find(c => c.id === selectedChainId);
  const usdcDecimals = selectedChain?.usdcDecimals || 6;
  const usdcDivisor = Math.pow(10, usdcDecimals);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDepositMethod('select');
      setQuote(null);
      setQuoteState('idle');
      setQuoteError(null);
      setLightningStatus('idle');
      setLightningError(null);
      setLightningTxHash(null);
      btcTx.reset();
      lightning.clearError();
    }
  }, [isOpen]);

  // Auto-connect Xverse when selecting native BTC
  useEffect(() => {
    if (depositMethod === 'native' && !btcAddress && !btcAccount.isConnecting) {
      handleConnectXverse();
    }
  }, [depositMethod]);

  // Fetch balance when BTC address is set
  useEffect(() => {
    if (btcAddress && depositMethod === 'native') {
      getBtcAddressInfo(btcAddress)
        .then(info => setBtcBalance(info.balance))
        .catch(() => setBtcBalance(null));
    }
  }, [btcAddress, depositMethod]);

  // Auto-fetch quote when params change (debounced)
  useEffect(() => {
    if (depositMethod !== 'native' || !btcAddress || !evmAddress) return;
    
    const amount = parseFloat(btcAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const paramsKey = `${btcAddress}-${evmAddress}-${btcAmount}-${selectedChainId}-${slippage}`;
    if (paramsKey === lastQuoteParamsRef.current) return;
    
    if (quoteTimeoutRef.current) {
      clearTimeout(quoteTimeoutRef.current);
    }
    
    setQuoteState('loading');
    setQuote(null);
    setQuoteError(null);
    
    quoteTimeoutRef.current = setTimeout(() => {
      lastQuoteParamsRef.current = paramsKey;
      fetchQuote();
    }, QUOTE_DEBOUNCE_MS);
    
    return () => {
      if (quoteTimeoutRef.current) {
        clearTimeout(quoteTimeoutRef.current);
      }
    };
  }, [depositMethod, btcAddress, evmAddress, btcAmount, selectedChainId, slippage]);

  const handleConnectXverse = async () => {
    try {
      const address = await btcAccount.connect();
      if (address) {
        setBtcAddress(address);
      }
    } catch (error) {
      console.error('Failed to connect Xverse:', error);
    }
  };

  const fetchQuote = useCallback(async () => {
    if (!btcAddress || !evmAddress) return;
    
    const amount = parseFloat(btcAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    try {
      const amountSats = Math.floor(amount * SATS_PER_BTC).toString();
      const result = await quoteMutation.mutateAsync({
        btcAddress,
        evmAddress,
        fromAmountSats: amountSats,
        toChainId: selectedChainId,
        toToken: selectedChain?.usdcAddress || '',
        slippage,
      });
      setQuote(result);
      setQuoteState('success');
      setQuoteError(null);
    } catch (error) {
      console.error('Quote error:', error);
      setQuoteError(error instanceof Error ? error.message : 'Failed to get quote');
      setQuoteState('error');
    }
  }, [btcAddress, evmAddress, btcAmount, selectedChainId, slippage, quoteMutation, selectedChain]);

  const handleRetryQuote = () => {
    lastQuoteParamsRef.current = '';
    fetchQuote();
  };

  const handleSendBtc = async () => {
    if (!quote || !btcAddress) return;
    
    try {
      const txHash = await btcTx.sendTransaction({ quote, btcAddress });
      console.log('BTC Transaction sent:', txHash);
    } catch (error) {
      console.error('Send BTC error:', error);
    }
  };

  // Lightning deposit flow
  const handleLightningDeposit = async () => {
    if (!evmAddress) {
      setLightningError('Please connect your EVM wallet first');
      return;
    }
    
    const sats = parseInt(satAmount);
    if (isNaN(sats) || sats < LIGHTNING_CONFIG.MIN_SATS) {
      setLightningError(`Minimum ${LIGHTNING_CONFIG.MIN_SATS} sats required`);
      return;
    }
    
    setLightningError(null);
    setLightningStatus('creating');
    
    try {
      // Use the deposit function which handles the full flow
      const result = await lightning.deposit(sats, evmAddress);
      
      if (result.success) {
        setLightningStatus('success');
        setLightningTxHash(result.paymentHash || null);
      } else {
        setLightningStatus('error');
        setLightningError(result.error || 'Deposit failed');
      }
    } catch (error) {
      setLightningStatus('error');
      setLightningError(error instanceof Error ? error.message : 'Deposit failed');
    }
  };

  if (!isOpen) return null;

  const estimatedUsdc = quote 
    ? parseFloat(quote.estimate.toAmount) / usdcDivisor 
    : parseFloat(btcAmount || '0') * BTC_PRICE_USD;

  const canSend = quote && btcAddress && !btcTx.isLoading && quoteState === 'success';
  const isLightningProcessing = ['creating', 'paying', 'verifying'].includes(lightningStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {depositMethod !== 'select' && (
              <button
                onClick={() => setDepositMethod('select')}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-semibold">
              {depositMethod === 'select' && 'Fund Your Account'}
              {depositMethod === 'native' && 'Send BTC'}
              {depositMethod === 'lightning' && '⚡ Lightning'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Method Selection */}
        {depositMethod === 'select' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center mb-6">
              Add funds to start swiping through trades
            </p>
            
            {/* Native BTC Option */}
            <button
              onClick={() => setDepositMethod('native')}
              className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-orange-500/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">₿</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                    Native BTC
                  </h3>
                  <p className="text-sm text-gray-400">
                    ~20 min • On-chain via Xverse
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-500 group-hover:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Lightning Option */}
            <button
              onClick={() => setDepositMethod('lightning')}
              className="w-full p-4 bg-dark-800 hover:bg-dark-700 border border-dark-600 hover:border-yellow-500/50 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-yellow-400 transition-colors">
                    Lightning
                  </h3>
                  <p className="text-sm text-gray-400">
                    ~15 sec • Instant via Alby
                  </p>
                </div>
                {!lightning.isAvailable && (
                  <span className="text-xs bg-dark-600 text-gray-400 px-2 py-1 rounded">
                    Install Alby
                  </span>
                )}
                <svg className="w-5 h-5 text-gray-500 group-hover:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Info */}
            <div className="mt-6 p-4 bg-gradient-to-br from-primary-500/10 to-orange-500/10 border border-primary-500/20 rounded-xl">
              <p className="text-sm text-gray-300 text-center">
                Funds convert to <span className="text-primary-400 font-medium">USDC</span> on Hyperliquid
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">
                Ready for swipe trading with up to 50x leverage
              </p>
            </div>
          </div>
        )}

        {/* Native BTC Flow */}
        {depositMethod === 'native' && (
          <div className="space-y-4">
            {!btcAddress ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">₿</span>
                </div>
                <p className="text-gray-400 mb-4">Connect your Bitcoin wallet</p>
                <button
                  onClick={handleConnectXverse}
                  disabled={btcAccount.isConnecting}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-dark-700 rounded-lg font-medium transition-colors"
                >
                  {btcAccount.isConnecting ? 'Connecting...' : 'Connect Xverse'}
                </button>
                {btcAccount.error && (
                  <p className="text-red-400 text-sm mt-2">{btcAccount.error}</p>
                )}
              </div>
            ) : (
              <>
                {/* Connected Address */}
                <div className="p-3 bg-dark-800/50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">Connected</p>
                    <p className="text-sm font-mono">{btcAddress.slice(0, 10)}...{btcAddress.slice(-6)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Balance</p>
                    <p className="text-sm font-medium">
                      {btcBalance !== null ? formatBtcDisplay(btcBalance) : '...'}
                    </p>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={btcAmount}
                      onChange={(e) => setBtcAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-orange-500 text-white text-lg pr-16"
                      disabled={btcTx.isLoading}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">BTC</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ≈ ${(parseFloat(btcAmount || '0') * BTC_PRICE_USD).toLocaleString()} USD
                  </p>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-2">
                  {[0.0001, 0.0005, 0.001, 0.005].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBtcAmount(amt.toString())}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                        btcAmount === amt.toString() ? 'bg-orange-500 text-white' : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                      }`}
                    >
                      {amt} BTC
                    </button>
                  ))}
                </div>

                {/* Slippage */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Slippage</label>
                  <div className="flex gap-2">
                    {[0.02, 0.03, 0.05].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          slippage === s ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                        }`}
                      >
                        {s * 100}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quote Display */}
                <div className="p-4 bg-dark-800 rounded-lg">
                  {quoteState === 'loading' && (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                      <span className="text-gray-400 text-sm">Getting best rate...</span>
                    </div>
                  )}
                  
                  {quoteState === 'error' && (
                    <div className="text-center py-2">
                      <p className="text-red-400 text-sm font-medium mb-2">No route available</p>
                      <p className="text-gray-500 text-xs mb-3">
                        {quoteError?.includes('slippage') ? 'Try increasing slippage to 5%' : 'Try a different amount or increase slippage'}
                      </p>
                      <button onClick={handleRetryQuote} className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-gray-300 rounded-lg text-sm font-medium">
                        Try Again
                      </button>
                    </div>
                  )}
                  
                  {quoteState === 'success' && quote && (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">You&apos;ll receive</p>
                        <p className="text-2xl font-bold text-primary-400">
                          ${estimatedUsdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">USDC on Hyperliquid</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>via {quote.tool}</p>
                        <p>~{Math.ceil(quote.estimate.executionDuration / 60)} min</p>
                      </div>
                    </div>
                  )}
                  
                  {quoteState === 'idle' && (
                    <p className="text-gray-500 text-sm text-center py-2">Enter amount to see quote</p>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendBtc}
                  disabled={!canSend}
                  className={`w-full px-4 py-4 rounded-xl font-semibold text-lg transition-all ${
                    canSend ? 'bg-gradient-to-r from-orange-500 to-primary-500 hover:from-orange-600 hover:to-primary-600 shadow-lg shadow-orange-500/20' : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {btcTx.isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Processing...
                    </span>
                  ) : quoteState === 'loading' ? 'Loading quote...' : !quote ? 'Enter amount' : `Send ${satsToBtc(quote.transactionRequest.value)} BTC`}
                </button>

                {/* Transaction Status */}
                {btcTx.status !== 'idle' && (
                  <div className={`p-4 rounded-lg ${
                    btcTx.status === 'error' ? 'bg-red-900/20 border border-red-700' :
                    btcTx.status === 'success' ? 'bg-green-900/20 border border-green-700' :
                    'bg-primary-900/20 border border-primary-700'
                  }`}>
                    {btcTx.status === 'signing' && <p className="text-primary-400">Sign in your wallet...</p>}
                    {btcTx.status === 'success' && (
                      <div>
                        <p className="text-green-400 font-medium">Transaction sent! 🎉</p>
                        <p className="text-xs text-gray-500 mt-1">USDC arrives in ~{quote ? Math.ceil(quote.estimate.executionDuration / 60) : 20} min</p>
                      </div>
                    )}
                    {btcTx.status === 'error' && <p className="text-red-400">{btcTx.error}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Lightning Flow */}
        {depositMethod === 'lightning' && (
          <div className="space-y-4">
            {/* Lightning Status */}
            <div className={`p-3 rounded-lg flex items-center gap-3 ${
              lightning.isConnected ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-dark-800'
            }`}>
              <span className="text-2xl">⚡</span>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {lightning.isConnected ? 'Lightning Connected' : 'Lightning Wallet'}
                </p>
                <p className="text-xs text-gray-400">
                  {lightning.isConnected 
                    ? lightning.walletInfo?.alias || 'Connected via WebLN'
                    : lightning.isAvailable ? 'Click to connect' : 'Install Alby extension'}
                </p>
              </div>
              {!lightning.isConnected && lightning.isAvailable && (
                <button
                  onClick={() => lightning.connect()}
                  disabled={lightning.isConnecting}
                  className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium"
                >
                  {lightning.isConnecting ? '...' : 'Connect'}
                </button>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min={LIGHTNING_CONFIG.MIN_SATS}
                  value={satAmount}
                  onChange={(e) => setSatAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-yellow-500 text-white text-lg pr-16"
                  disabled={isLightningProcessing}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">sats</span>
              </div>
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">
                  ≈ {(parseInt(satAmount || '0') / SATS_PER_BTC).toFixed(8)} BTC
                </p>
                <p className="text-xs text-gray-500">
                  ≈ ${((parseInt(satAmount || '0') / SATS_PER_BTC) * BTC_PRICE_USD).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-2">
              {[1000, 10000, 50000, 100000].map((sats) => (
                <button
                  key={sats}
                  onClick={() => setSatAmount(sats.toString())}
                  disabled={isLightningProcessing}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    satAmount === sats.toString() ? 'bg-yellow-500 text-black' : 'bg-dark-700 text-gray-300 hover:bg-dark-600 disabled:opacity-50'
                  }`}
                >
                  {sats.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Processing Steps */}
            {isLightningProcessing && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
                  <div>
                    <p className="text-yellow-400 font-medium">
                      {lightningStatus === 'creating' && 'Creating invoice...'}
                      {lightningStatus === 'paying' && 'Waiting for payment...'}
                      {lightningStatus === 'verifying' && 'Verifying payment...'}
                    </p>
                    <p className="text-xs text-yellow-300/70">
                      {lightningStatus === 'paying' && 'Please confirm in your Lightning wallet'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success */}
            {lightningStatus === 'success' && (
              <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                <p className="text-green-400 font-medium">⚡ Payment successful!</p>
                <p className="text-xs text-gray-400 mt-1">
                  USDC will be credited shortly
                </p>
                {lightningTxHash && (
                  <p className="text-xs text-gray-500 mt-2 font-mono break-all">
                    Hash: {lightningTxHash}
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {(lightningError || lightningStatus === 'error') && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm">{lightningError || lightning.error || 'Payment failed'}</p>
              </div>
            )}

            {/* Info */}
            {lightningStatus === 'idle' && (
              <div className="p-4 bg-dark-800/50 rounded-lg">
                <p className="text-sm font-medium text-gray-300 mb-2">Instant funding</p>
                <p className="text-xs text-gray-400">
                  Pay a Lightning invoice and receive USDC on Hyperliquid in seconds. 
                  No minimum, no waiting.
                </p>
              </div>
            )}

            {/* Deposit Button */}
            <button
              onClick={handleLightningDeposit}
              disabled={!lightning.isAvailable || isLightningProcessing || lightningStatus === 'success'}
              className="w-full px-4 py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-dark-700 disabled:to-dark-700 text-black disabled:text-gray-500 rounded-xl font-semibold text-lg transition-all"
            >
              {isLightningProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                  Processing...
                </span>
              ) : lightningStatus === 'success' ? (
                '✓ Funded'
              ) : !lightning.isAvailable ? (
                'Install Alby Wallet'
              ) : !lightning.isConnected ? (
                'Connect & Deposit'
              ) : (
                `Deposit ${parseInt(satAmount).toLocaleString()} sats`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
