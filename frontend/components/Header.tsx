'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AuthStatusIndicator } from '@/components/AuthStatusIndicator';
import { useUserStore } from '@/store/userStore';

export function Header() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const getAuthStatus = useUserStore((state) => state.getAuthStatus);
  const authStatus = getAuthStatus(isConnected);
  const isReadyToTrade = authStatus === 'ready_to_trade';

  return (
    <header className="border-b border-dark-800">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">
              HypeSwipe
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-dark-700 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Wallet
            </Link>
            {isReadyToTrade ? (
              <Link
                href="/swipe"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === '/swipe'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                🔥 Swipe
              </Link>
            ) : (
              <span
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 cursor-not-allowed"
                title="Complete setup to unlock"
              >
                🔒 Swipe
              </span>
            )}
          </nav>
        </div>

        <AuthStatusIndicator />
      </div>
    </header>
  );
}
