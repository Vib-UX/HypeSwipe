'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  // BTC address (auto-detected from MetaMask or manually entered)
  btcAddress: string | null;
  setBtcAddress: (address: string | null) => void;
  
  // Whether the BTC address setup modal has been shown
  btcAddressConfirmed: boolean;
  setBtcAddressConfirmed: (confirmed: boolean) => void;
  
  // Reset all user state
  reset: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      btcAddress: null,
      btcAddressConfirmed: false,
      
      setBtcAddress: (address) => set({ btcAddress: address }),
      setBtcAddressConfirmed: (confirmed) => set({ btcAddressConfirmed: confirmed }),
      
      reset: () => set({
        btcAddress: null,
        btcAddressConfirmed: false,
      }),
    }),
    {
      name: 'hypeswipe-user',
      partialize: (state) => ({
        btcAddress: state.btcAddress,
        btcAddressConfirmed: state.btcAddressConfirmed,
      }),
    }
  )
);
