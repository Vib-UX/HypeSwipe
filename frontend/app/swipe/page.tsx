'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { SwipeCard } from '@/components/SwipeCard';
import { useUserStore } from '@/store/userStore';
import { useMarkets } from '@/hooks/useMarkets';
import type { TradeCard, PearMarket, MarketMetrics, AITradeIdea, SentimentData } from '@/types/trade';

const SIZE_OPTIONS = [5, 7, 10] as const;

const DEFAULT_SENTIMENT: SentimentData = {
  bullish: 50,
  summary: 'Analyzing market conditions...',
};

/**
 * Transform a PearMarket + AITradeIdea into a TradeCard (without candles).
 */
function transformToTradeCard(
  market: PearMarket,
  idea: AITradeIdea,
  index: number
): Omit<TradeCard, 'candles'> {
  const marketMetrics: MarketMetrics = {
    openInterest: market.openInterest,
    volume: market.volume,
    change24h: market.change24h,
    netFunding: market.netFunding,
  };

  const primaryAsset =
    market.longAssets.length > 0
      ? market.longAssets[0].asset
      : market.shortAssets.length > 0
        ? market.shortAssets[0].asset
        : 'UNKNOWN';

  const marketId = `${market.displayName.replace(/\s+/g, '-').toLowerCase()}-${index}`;

  return {
    id: marketId,
    ticker: primaryAsset,
    tagline: idea.tagline,
    direction: idea.direction,
    timeframe: '4h',
    leverage: idea.leverage,
    sentiment: {
      bullish: idea.bullishPercent,
      summary: idea.sentiment,
      leverageReasoning: idea.reasoning,
    },
    news: [],
    positionType: market.positionType,
    longAssets: market.longAssets,
    shortAssets: market.shortAssets,
    marketMetrics,
  };
}

/**
 * Fallback transform when AI is not available.
 */
function transformToFallbackTradeCard(
  market: PearMarket,
  index: number
): Omit<TradeCard, 'candles'> {
  const marketMetrics: MarketMetrics = {
    openInterest: market.openInterest,
    volume: market.volume,
    change24h: market.change24h,
    netFunding: market.netFunding,
  };

  const primaryAsset =
    market.longAssets.length > 0
      ? market.longAssets[0].asset
      : market.shortAssets.length > 0
        ? market.shortAssets[0].asset
        : 'UNKNOWN';

  const direction: 'LONG' | 'SHORT' =
    market.positionType === 'one_directional' && market.shortAssets.length > 0 && market.longAssets.length === 0
      ? 'SHORT'
      : 'LONG';

  const marketId = `${market.displayName.replace(/\s+/g, '-').toLowerCase()}-${index}`;

  return {
    id: marketId,
    ticker: primaryAsset,
    tagline: 'Trade Setup',
    direction,
    timeframe: '4h',
    leverage: 5,
    sentiment: DEFAULT_SENTIMENT,
    news: [],
    positionType: market.positionType,
    longAssets: market.longAssets,
    shortAssets: market.shortAssets,
    marketMetrics,
  };
}

export default function SwipePage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const getAuthStatus = useUserStore((state) => state.getAuthStatus);
  const authStatus = getAuthStatus(isConnected);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ taken: 0, skipped: 0 });
  const [size, setSize] = useState<number>(10);
  const [tradesWithCandles, setTradesWithCandles] = useState<TradeCard[]>([]);
  const [processedMarketIds, setProcessedMarketIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: marketsData,
    isLoading: marketsLoading,
    error: marketsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMarkets();

  // Flatten all pages into a single array of markets
  const allMarkets = useMemo(() => {
    if (!marketsData?.pages) {
      return [];
    }
    return marketsData.pages.flatMap((page) => page.markets);
  }, [marketsData]);

  // Auth redirect
  useEffect(() => {
    if (authStatus !== 'ready_to_trade') {
      router.replace('/auth');
    }
  }, [authStatus, router]);

  // Auto-fetch next page when 1 card left
  useEffect(() => {
    const remainingCards = tradesWithCandles.length - currentIndex;
    if (remainingCards <= 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [currentIndex, tradesWithCandles.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Process new markets: generate AI trade ideas + fetch candles
  useEffect(() => {
    async function processNewMarkets() {
      // Find markets we haven't processed yet
      const newMarkets = allMarkets.filter(
        (m, i) => !processedMarketIds.has(`${m.displayName}-${i}`)
      );

      if (newMarkets.length === 0 || isProcessing) {
        return;
      }

      setIsProcessing(true);

      try {
        let tradeIdeas: AITradeIdea[] = [];
        try {
          const aiResponse = await fetch('/api/ai/generate-trades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markets: newMarkets }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            tradeIdeas = aiData.trades || [];
          }
        } catch (err) {
          console.error('AI generate-trades failed:', err);
        }

        // Create trade ideas map by marketIndex
        const ideasByIndex = new Map<number, AITradeIdea>();
        tradeIdeas.forEach((idea) => {
          ideasByIndex.set(idea.marketIndex, idea);
        });

        // Transform markets to TradeCards with AI data
        const tradesWithoutCandles = newMarkets.map((market, localIndex) => {
          const globalIndex = allMarkets.indexOf(market);
          const idea = ideasByIndex.get(localIndex);

          if (idea) {
            return transformToTradeCard(market, idea, globalIndex);
          }
          return transformToFallbackTradeCard(market, globalIndex);
        });

        // Fetch candles for each trade
        const tradesWithCandleData = await Promise.all(
          tradesWithoutCandles.map(async (trade) => {
            try {
              const res = await fetch('/api/candles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  coin: trade.ticker,
                  interval: trade.timeframe,
                }),
              });
              const data = await res.json();
              return {
                ...trade,
                candles: data.candles || [],
              } as TradeCard;
            } catch {
              return { ...trade, candles: [] } as TradeCard;
            }
          })
        );

        // Update processed IDs
        const newProcessedIds = new Set(processedMarketIds);
        newMarkets.forEach((m) => {
          const globalIndex = allMarkets.indexOf(m);
          newProcessedIds.add(`${m.displayName}-${globalIndex}`);
        });
        setProcessedMarketIds(newProcessedIds);

        // Add to trades
        setTradesWithCandles((prev) => [...prev, ...tradesWithCandleData]);
      } catch (error) {
        console.error('Error processing markets:', error);
      } finally {
        setIsProcessing(false);
      }
    }

    processNewMarkets();
  }, [allMarkets, processedMarketIds, isProcessing]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      setStats((prev) => ({ ...prev, taken: prev.taken + 1 }));
    } else {
      setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const loading = marketsLoading || (isProcessing && tradesWithCandles.length === 0);

  const remainingTrades = useMemo(() => {
    return tradesWithCandles.slice(currentIndex);
  }, [tradesWithCandles, currentIndex]);

  const isFinished = !loading && currentIndex >= tradesWithCandles.length && tradesWithCandles.length > 0 && !hasNextPage;

  if (authStatus !== 'ready_to_trade') {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Redirecting to setup...</div>
        </main>
      </div>
    );
  }

  if (marketsError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to load markets</h2>
          <p className="text-gray-400 text-center mb-6">
            {marketsError instanceof Error ? marketsError.message : 'Unable to fetch market data. Please try again.'}
          </p>
        </main>
      </div>
    );
  }

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
            {loading ? 'Loading...' : isFetchingNextPage || isProcessing ? 'Loading more...' : ""}
          </div>
        </div>

        {/* Size selector */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs text-gray-500 mr-2">Size:</span>
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                size === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
              }`}
            >
              ${s}
            </button>
          ))}
        </div>

        {/* Card stack */}
        <div className="flex-1 relative min-h-[500px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Fetching live markets...</p>
            </div>
          ) : isFinished ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">You&apos;ve seen them all!</h2>
              <p className="text-gray-400 mb-2">
                {stats.taken} trades taken, {stats.skipped} skipped
              </p>
              <p className="text-gray-500 text-sm">
                Check back later for new markets
              </p>
            </div>
          ) : remainingTrades.length === 0 && !hasNextPage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No markets available</h2>
              <p className="text-gray-400">Check back later for new trading opportunities.</p>
            </div>
          ) : (
            <>
              {remainingTrades.slice(0, 2).map((trade, index) => (
                <SwipeCard
                  key={trade.id}
                  trade={trade}
                  size={size}
                  isTop={index === 0}
                  onSwipe={handleSwipe}
                />
              ))}
            </>
          )}
        </div>

        {/* Action buttons */}
        {!loading && !isFinished && remainingTrades.length > 0 && (
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
