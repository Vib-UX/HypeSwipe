'use client';

import { useDisconnect } from 'wagmi';
import { logoutPear } from '@/lib/pear-api';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/providers/ToastProvider';

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export function usePearLogout() {
  const { disconnect } = useDisconnect();
  const { resetPearAuth, pearRefreshToken } = useUserStore();
  const { showToast } = useToast();

  const logout = async (): Promise<LogoutResult> => {
    try {
      showToast('Logging out...', 'success', 0);

      if (pearRefreshToken) {
        await logoutPear(pearRefreshToken);
      } else {
        resetPearAuth();
      }

      await disconnect();

      showToast('Logged out successfully', 'success', 5000);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';

      resetPearAuth();

      try {
        await disconnect();
      } catch (disconnectError) {
        console.error('Disconnect failed:', disconnectError);
      }

      showToast(errorMessage, 'error', 5000);

      return { success: false, error: errorMessage };
    }
  };

  return {
    logout,
    canLogout: !!pearRefreshToken,
  };
}
