'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { SwipeCard } from '@/components/SwipeCard';
import { DEMO_TRADES } from '@/types/trade';

export default function SwipePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trades, setTrades] = useState(DEMO_TRADES);
  const [stats, setStats] = useState({ taken: 0, skipped: 0 });

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      setStats((prev) => ({ ...prev, taken: prev.taken + 1 }));
      // TODO: Execute trade logic
    } else {
      setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const remainingTrades = trades.slice(currentIndex);
  const isFinished = currentIndex >= trades.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6">
        {/* Stats bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-medium">{stats.taken} taken</span>
            <span className="text-gray-600">|</span>
            <span className="text-red-400 font-medium">{stats.skipped} skipped</span>
          </div>
          <div className="text-gray-500 text-sm">
            {trades.length - currentIndex} left
          </div>
        </div>

        {/* Card stack */}
        <div className="flex-1 relative min-h-[500px]">
          {isFinished ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
                <span className="text-4xl">🔥</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">All Done!</h2>
              <p className="text-gray-400 mb-6">
                You took {stats.taken} trades and skipped {stats.skipped}
              </p>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setStats({ taken: 0, skipped: 0 });
                }}
                className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl font-medium transition-colors"
              >
                Start Over
              </button>
            </div>
          ) : (
            <>
              {remainingTrades.slice(0, 2).map((trade, index) => (
                <SwipeCard
                  key={trade.id}
                  trade={trade}
                  isTop={index === 0}
                  onSwipe={handleSwipe}
                />
              ))}
            </>
          )}
        </div>

        {/* Action buttons (mobile friendly) */}
        {!isFinished && (
          <div className="flex justify-center gap-6 mt-4">
            <button
              onClick={() => handleSwipe('left')}
              className="w-16 h-16 rounded-full bg-dark-800 border-2 border-red-500/50 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => handleSwipe('right')}
              className="w-16 h-16 rounded-full bg-dark-800 border-2 border-green-500/50 flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
