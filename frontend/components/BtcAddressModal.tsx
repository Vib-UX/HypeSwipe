'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/userStore';

interface BtcAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BtcAddressModal({ isOpen, onClose }: BtcAddressModalProps) {
  const { btcAddress, setBtcAddress, setBtcAddressConfirmed } = useUserStore();
  const [inputValue, setInputValue] = useState(btcAddress || '');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateBtcAddress = (address: string): boolean => {
    // Basic validation for mainnet BTC addresses
    // bc1... (native segwit), 1... (legacy), 3... (P2SH)
    const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
    return btcRegex.test(address);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = inputValue.trim();
    
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

  const handleSkip = () => {
    setBtcAddressConfirmed(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold mb-2">Link Your BTC Address</h2>
        <p className="text-gray-400 text-sm mb-6">
          To top up with BTC, we need your Bitcoin address. This is stored locally
          and used to create deposit transactions.
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
              className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg focus:outline-none focus:border-primary-500 text-white placeholder-gray-500"
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-6">
            Supported formats: Native SegWit (bc1...), Legacy (1...), P2SH (3...)
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 rounded-lg font-medium transition-colors text-gray-300"
            >
              Skip for now
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-medium transition-colors"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
