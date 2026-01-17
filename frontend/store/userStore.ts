'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  // BTC address (manually entered by user since MetaMask doesn't expose it yet)
  btcAddress: string | null;
  setBtcAddress: (address: string | null) => void;

  // Whether the BTC address setup modal has been shown
  btcAddressConfirmed: boolean;
  setBtcAddressConfirmed: (confirmed: boolean) => void;

  // Pear Protocol Authentication
  pearAccessToken: string | null;
  pearRefreshToken: string | null;
  builderCodeApproved: boolean;
  agentWalletApproved: boolean;
  agentWalletAddress: string | null;
  setPearTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setBuilderApproved: (approved: boolean) => void;
  setAgentWalletApproved: (approved: boolean, address: string | null) => void;

  // Reset all user state
  reset: () => void;
  resetPearAuth: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      btcAddress: null,
      btcAddressConfirmed: false,

      pearAccessToken: null,
      pearRefreshToken: null,
      builderCodeApproved: false,
      agentWalletApproved: false,
      agentWalletAddress: null,

      setBtcAddress: (address) => set({ btcAddress: address }),
      setBtcAddressConfirmed: (confirmed) => set({ btcAddressConfirmed: confirmed }),

      setPearTokens: (accessToken, refreshToken) => set({
        pearAccessToken: accessToken,
        pearRefreshToken: refreshToken,
      }),
      setBuilderApproved: (approved) => set({ builderCodeApproved: approved }),
      setAgentWalletApproved: (approved, address) => set({
        agentWalletApproved: approved,
        agentWalletAddress: address,
      }),

      reset: () => set({
        btcAddress: null,
        btcAddressConfirmed: false,
        pearAccessToken: null,
        pearRefreshToken: null,
        builderCodeApproved: false,
        agentWalletApproved: false,
        agentWalletAddress: null,
      }),
      resetPearAuth: () => set({
        pearAccessToken: null,
        pearRefreshToken: null,
        builderCodeApproved: false,
        agentWalletApproved: false,
        agentWalletAddress: null,
      }),
    }),
    {
      name: 'hypeswipe-user',
      partialize: (state) => ({
        btcAddress: state.btcAddress,
        btcAddressConfirmed: state.btcAddressConfirmed,
        pearAccessToken: state.pearAccessToken,
        pearRefreshToken: state.pearRefreshToken,
        builderCodeApproved: state.builderCodeApproved,
        agentWalletApproved: state.agentWalletApproved,
        agentWalletAddress: state.agentWalletAddress,
      }),
    }
  )
);
