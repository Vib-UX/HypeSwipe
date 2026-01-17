'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useBtcAccount } from '@/hooks/useBtcAccount';

interface BtcAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BtcAddressModal({ isOpen, onClose }: BtcAddressModalProps) {
  const { btcAddress, setBtcAddress, setBtcAddressConfirmed } = useUserStore();
  const { 
    paymentAccount, 
    isLoading, 
    error: xverseError, 
    availableWallets,
    requestAccounts 
  } = useBtcAccount();
  
  const [inputValue, setInputValue] = useState(btcAddress || '');
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // When payment account is detected from Xverse, auto-fill
  useEffect(() => {
    if (paymentAccount?.address) {
      setInputValue(paymentAccount.address);
    }
  }, [paymentAccount]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConnectionAttempted(false);
      setShowManualInput(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateBtcAddress = (address: string): boolean => {
    const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    return btcRegex.test(address);
  };

  const handleConnectXverse = async () => {
    setConnectionAttempted(true);
    setError(null);
    await requestAccounts();
  };

  const handleConfirm = (address: string) => {
    setError(null);
    const trimmed = address.trim();
    
    if (!trimmed) {
      setError('Please enter your BTC address');
      return;
    }

    if (!validateBtcAddress(trimmed)) {
      setError('Invalid BTC address format. Please check and try again.');
      return;
    }

    setBtcAddress(trimmed);
    setBtcAddressConfirmed(true);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirm(inputValue);
  };

  const handleUseXverseAddress = () => {
    if (paymentAccount?.address) {
      handleConfirm(paymentAccount.address);
    }
  };

  const handleSkip = () => {
    setBtcAddressConfirmed(true);
    onClose();
  };

  const hasXverseInstalled = availableWallets.some(
    w => w.name.toLowerCase().includes('xverse')
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
          <div className="flex flex-col items-center py-8">
            <svg className="animate-spin h-10 w-10 text-orange-500 mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <h2 className="text-lg font-semibold mb-2">Connecting to Xverse</h2>
            <p className="text-gray-400 text-sm text-center">
              Please approve the connection in your Xverse wallet popup...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state - BTC address from Xverse
  if (paymentAccount?.address && !showManualInput) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 className="text-xl font-semibold mb-2">Bitcoin Wallet Connected</h2>
          <p className="text-gray-400 text-sm mb-6">Connected to Xverse wallet</p>

          <div className="p-4 bg-dark-800 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 mb-1">Payment Address (Native SegWit)</p>
                <p className="font-mono text-sm text-gray-200 truncate">
                  {paymentAccount.address}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors text-gray-300 text-sm"
            >
              Use Different Address
            </button>
            <button
              onClick={handleUseXverseAddress}
              className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
            >
              Use This Address
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial/Error state
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">
          {showManualInput ? 'Enter BTC Address' : 'Connect Bitcoin Wallet'}
        </h2>
        
        {/* Xverse connection options */}
        {!showManualInput && !connectionAttempted && (
          <>
            <p className="text-gray-400 text-sm mb-6">
              Connect your Xverse wallet to use Bitcoin for deposits.
            </p>

            {/* Wallet status */}
            {availableWallets.length > 0 ? (
              <div className="mb-4 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                <p className="text-green-400 text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {availableWallets.length} Bitcoin wallet{availableWallets.length > 1 ? 's' : ''} detected
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {availableWallets.map(w => w.name).join(', ')}
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <p className="text-yellow-400 text-sm">No Bitcoin wallet detected</p>
                <p className="text-xs text-gray-400 mt-1">
                  Please install{' '}
                  <a 
                    href="https://www.xverse.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:underline"
                  >
                    Xverse wallet
                  </a>
                </p>
              </div>
            )}
            
            <button
              onClick={handleConnectXverse}
              disabled={availableWallets.length === 0}
              className="w-full mb-4 px-4 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
              </svg>
              Connect Xverse Wallet
            </button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dark-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-900 text-gray-500">or</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowManualInput(true)}
              className="w-full px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors text-gray-300"
            >
              Enter Address Manually
            </button>
            
            <button
              onClick={handleSkip}
              className="w-full mt-3 px-4 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
            >
              Skip for now
            </button>
          </>
        )}

        {/* Error state after connection attempt */}
        {xverseError && connectionAttempted && !showManualInput && (
          <div className="space-y-4">
            <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
              <p className="text-red-400 text-sm font-medium mb-1">Connection failed</p>
              <p className="text-gray-400 text-xs">{xverseError}</p>
            </div>

            {/* Troubleshooting tips */}
            <div className="p-3 bg-dark-800 rounded-lg">
              <p className="text-gray-300 text-sm font-medium mb-2">Troubleshooting:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Make sure Xverse is unlocked</li>
                <li>• Check if a popup was blocked by your browser</li>
                <li>• Try refreshing the page</li>
                <li>• Make sure you&apos;re on Bitcoin Mainnet</li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConnectionAttempted(false);
                }}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors text-gray-300"
              >
                Try Again
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
              >
                Enter Manually
              </button>
            </div>
          </div>
        )}

        {/* Manual input form */}
        {showManualInput && (
          <>
            <p className="text-gray-400 text-sm mb-6">
              Enter the Bitcoin address you want to use for deposits.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="btcAddress" className="block text-sm font-medium text-gray-300 mb-2">
                  Bitcoin Address
                </label>
                <input
                  id="btcAddress"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="bc1q..."
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-white placeholder-gray-500 font-mono text-sm"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-400">{error}</p>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-6">
                Supported: Native SegWit (bc1q...), Taproot (bc1p...), Legacy (1...), P2SH (3...)
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(false);
                    setConnectionAttempted(false);
                  }}
                  className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors text-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
                >
                  Confirm
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
