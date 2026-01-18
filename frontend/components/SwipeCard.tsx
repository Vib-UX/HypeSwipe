'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { MiniChart } from './MiniChart';
import type { TradeCard, MarketMetrics } from '@/types/trade';

// Client-side cache for icon URLs
const iconUrlCache = new Map<string, string | null>();

function CryptoIcon({ symbol, size = 24, className = '' }: { symbol: string; size?: number; className?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(iconUrlCache.get(symbol.toLowerCase()) ?? null);
  const [isLoading, setIsLoading] = useState(!iconUrlCache.has(symbol.toLowerCase()));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const lowerSymbol = symbol.toLowerCase();

    // Already cached
    if (iconUrlCache.has(lowerSymbol)) {
      setImageUrl(iconUrlCache.get(lowerSymbol) ?? null);
      setIsLoading(false);
      return;
    }

    // Fetch from our API
    fetch(`/api/coin-icon?symbol=${encodeURIComponent(lowerSymbol)}`)
      .then((res) => res.json())
      .then((data) => {
        iconUrlCache.set(lowerSymbol, data.imageUrl);
        setImageUrl(data.imageUrl);
        setIsLoading(false);
      })
      .catch(() => {
        iconUrlCache.set(lowerSymbol, null);
        setImageUrl(null);
        setIsLoading(false);
      });
  }, [symbol]);

  // Loading or no image: show letter fallback
  if (isLoading || !imageUrl || hasError) {
    return (
      <span
        className={`font-bold flex items-center justify-center ${className}`}
        style={{ fontSize: size * 0.5, width: size, height: size }}
      >
        {symbol.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={symbol}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

interface SwipeCardProps {
  trade: TradeCard;
  size: number;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

/**
 * Formats a numeric string or number value into a compact format.
 * E.g., 1200000 -> "$1.2M", 50000 -> "$50.0K"
 */
function formatCompactValue(value: string | number, prefix = '$'): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return `${prefix}--`;
  }

  if (Math.abs(numValue) >= 1_000_000_000) {
    return `${prefix}${(numValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(numValue) >= 1_000_000) {
    return `${prefix}${(numValue / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(numValue) >= 1_000) {
    return `${prefix}${(numValue / 1_000).toFixed(1)}K`;
  }
  return `${prefix}${numValue.toFixed(2)}`;
}

/**
 * Formats a percentage change value with sign and color.
 */
function formatChange24h(value: string): { text: string; isPositive: boolean } {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return { text: '--', isPositive: true };
  }

  const isPositive = numValue >= 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${numValue.toFixed(2)}%`,
    isPositive,
  };
}

/**
 * Renders market metrics section showing 24h change, volume, and OI.
 * Only renders if marketMetrics is available.
 */
function MarketMetricsDisplay({ metrics }: { metrics: MarketMetrics }) {
  const change = formatChange24h(metrics.change24h);

  return (
    <div className="px-4 py-2 border-t border-dark-700 bg-dark-900/30">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 uppercase tracking-wide">24h</span>
          <span className={change.isPositive ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
            {change.text}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 uppercase tracking-wide">Vol</span>
          <span className="text-gray-300 font-medium">
            {formatCompactValue(metrics.volume)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 uppercase tracking-wide">OI</span>
          <span className="text-gray-300 font-medium">
            {formatCompactValue(metrics.openInterest)}
          </span>
        </div>
      </div>
    </div>
  );
}


function CardHeader({ trade }: { trade: TradeCard }) {
  const isLong = trade.direction === 'LONG';
  const primaryAsset = trade.longAssets?.[0]?.asset || trade.shortAssets?.[0]?.asset || trade.ticker;

  if (trade.positionType === 'relative_pair' && trade.longAssets?.[0] && trade.shortAssets?.[0]) {
    const pairText = `${trade.longAssets[0].asset} vs ${trade.shortAssets[0].asset}`;
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute top-0 left-0 w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center overflow-hidden">
            <CryptoIcon symbol={trade.longAssets[0].asset} size={18} className="text-green-400" />
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center overflow-hidden">
            <CryptoIcon symbol={trade.shortAssets[0].asset} size={18} className="text-red-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-white truncate">{trade.tagline}</h3>
          <p className="text-xs text-gray-500">{pairText} • {trade.timeframe.toUpperCase()}</p>
        </div>
      </div>
    );
  }

  // For one-directional, show single icon with direction color
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
        isLong
          ? 'bg-green-500/20 border border-green-500/30'
          : 'bg-red-500/20 border border-red-500/30'
      }`}>
        <CryptoIcon symbol={primaryAsset} size={24} className={isLong ? 'text-green-400' : 'text-red-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg text-white truncate">{trade.tagline}</h3>
        <p className="text-xs text-gray-500">{primaryAsset} • {trade.timeframe.toUpperCase()}</p>
      </div>
    </div>
  );
}

/**
 * Determines the display leverage value and styling based on AI suggestion.
 * Returns the leverage value (AI-suggested or fallback) and whether it's high leverage.
 */
function getLeverageDisplay(trade: TradeCard): { value: number; isHigh: boolean; isAISuggested: boolean } {
  const aiLeverage = trade.sentiment.leverage;
  const value = aiLeverage ?? trade.leverage;
  const isHigh = value > 10;
  const isAISuggested = aiLeverage !== undefined;
  return { value, isHigh, isAISuggested };
}

/**
 * Gets the appropriate color class for leverage display.
 * High leverage (above 10x) shows warning colors.
 */
function getLeverageColorClass(isHigh: boolean, isAISuggested: boolean): string {
  if (isHigh) {
    return 'text-orange-400';
  }
  if (isAISuggested) {
    return 'text-primary-400';
  }
  return 'text-primary-400';
}

/**
 * Renders the news section with either news items or a placeholder.
 * - If news data available, display news items with sentiment indicators
 * - If no news: Show "News feed coming soon" placeholder
 */
function NewsSection({ news }: { news?: { title: string; source: string; time: string; sentiment: 'positive' | 'negative' | 'neutral' }[] }) {
  const hasNews = news && news.length > 0;

  return (
    <div className="border-t border-dark-700">
      <div className="px-4 py-2 flex items-center gap-2">
        <span className="text-xs">📰</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Latest News</span>
      </div>
      <div className="px-4 pb-3">
        {hasNews ? (
          <div className="space-y-2">
            {news.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`text-[10px] mt-0.5 ${
                  item.sentiment === 'positive' ? 'text-green-400' :
                  item.sentiment === 'negative' ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {item.sentiment === 'positive' ? '▲' : item.sentiment === 'negative' ? '▼' : '●'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-300 leading-tight truncate">
                    {item.title}
                  </p>
                  <p className="text-[9px] text-gray-600">
                    {item.source} - {item.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-3">
            <p className="text-[11px] text-gray-500 italic">
              News feed coming soon
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SwipeCard({ trade, size, onSwipe, isTop }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState({ x: 0, startX: 0, isDragging: false });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showLeverageReasoning, setShowLeverageReasoning] = useState(false);

  const handleStart = (clientX: number) => {
    if (!isTop) return;
    setDragState({ x: 0, startX: clientX, isDragging: true });
  };

  const handleMove = (clientX: number) => {
    if (!dragState.isDragging) return;
    const x = clientX - dragState.startX;
    setDragState((prev) => ({ ...prev, x }));
    setSwipeDirection(x > 50 ? 'right' : x < -50 ? 'left' : null);
  };

  const handleEnd = () => {
    if (!dragState.isDragging) return;

    const threshold = 100;
    if (dragState.x > threshold) {
      onSwipe('right');
    } else if (dragState.x < -threshold) {
      onSwipe('left');
    }

    setDragState({ x: 0, startX: 0, isDragging: false });
    setSwipeDirection(null);
  };

  const rotation = dragState.x * 0.05;
  const opacity = Math.max(0, 1 - Math.abs(dragState.x) / 300);

  // Determine if we should show the direction badge (only for non-relative pairs or backward compat)
  const showDirectionBadge = !trade.positionType || trade.positionType === 'one_directional';

  // Get leverage display properties
  const leverageDisplay = getLeverageDisplay(trade);
  const leverageColorClass = getLeverageColorClass(leverageDisplay.isHigh, leverageDisplay.isAISuggested);
  const hasLeverageReasoning = Boolean(trade.sentiment.leverageReasoning);

  const handleLeverageTap = () => {
    if (hasLeverageReasoning) {
      setShowLeverageReasoning((prev) => !prev);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 select-none ${isTop ? 'cursor-grab active:cursor-grabbing z-10' : 'z-0'}`}
      style={{
        transform: isTop
          ? `translateX(${dragState.x}px) rotate(${rotation}deg)`
          : 'scale(0.95) translateY(20px)',
        opacity: isTop ? opacity : 0.5,
        transition: dragState.isDragging ? 'none' : 'all 0.3s ease-out',
      }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
    >
      {/* Swipe indicators */}
      {swipeDirection === 'right' && (
        <div className="absolute top-6 left-6 z-20 px-4 py-2 bg-green-500/90 rounded-lg border-2 border-green-400 rotate-[-15deg]">
          <span className="text-white font-bold text-lg">TRADE ✓</span>
        </div>
      )}
      {swipeDirection === 'left' && (
        <div className="absolute top-6 right-6 z-20 px-4 py-2 bg-red-500/90 rounded-lg border-2 border-red-400 rotate-[15deg]">
          <span className="text-white font-bold text-lg">SKIP ✗</span>
        </div>
      )}

      {/* Card content */}
      <div className="h-full bg-dark-800/90 backdrop-blur border border-dark-700 rounded-3xl overflow-y-auto scrollbar-thin flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <CardHeader trade={trade} />
          {/* Direction badge - only show for backward compat and one_directional */}
          {showDirectionBadge && (
            <div
              className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                trade.direction === 'LONG'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {trade.direction === 'LONG' ? '↑' : '↓'} {trade.direction}
            </div>
          )}
          {/* Pair indicator for relative pairs */}
          {trade.positionType === 'relative_pair' && (
            <div className="px-3 py-1.5 rounded-lg font-bold text-sm bg-purple-500/20 text-purple-400 border border-purple-500/30">
              PAIR
            </div>
          )}
        </div>

        {/* Market Metrics - only show if available */}
        {trade.marketMetrics && (
          <MarketMetricsDisplay metrics={trade.marketMetrics} />
        )}

        {/* Chart */}
        <div className="flex-1 p-2 min-h-[200px]">
          {trade.candles.length > 0 ? (
            <MiniChart candles={trade.candles} direction={trade.direction} />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading chart...</div>
            </div>
          )}
        </div>

        {/* Trade details - Leverage and Size */}
        <div className="px-4 py-3 border-t border-dark-700 bg-dark-900/50">
          <div className="flex items-center justify-center gap-6">
            <div
              className="text-center relative"
              onClick={handleLeverageTap}
              onKeyDown={(e) => e.key === 'Enter' && handleLeverageTap()}
              role={hasLeverageReasoning ? 'button' : undefined}
              tabIndex={hasLeverageReasoning ? 0 : undefined}
              aria-label={hasLeverageReasoning ? 'Show leverage reasoning' : undefined}
            >
              <div className="flex items-center justify-center gap-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Leverage</p>
                {leverageDisplay.isAISuggested && (
                  <span className="text-[8px]">🤖</span>
                )}
                {leverageDisplay.isHigh && (
                  <span className="text-[10px] text-orange-400" title="High leverage warning">!</span>
                )}
              </div>
              <p className={`text-lg font-bold ${leverageColorClass}`}>
                {leverageDisplay.value}x
              </p>
              {/* Leverage reasoning tooltip */}
              {showLeverageReasoning && trade.sentiment.leverageReasoning && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-dark-700 border border-dark-600 rounded-lg shadow-lg z-30">
                  <p className="text-[10px] text-gray-300 leading-relaxed">
                    {trade.sentiment.leverageReasoning}
                  </p>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-dark-700" />
                </div>
              )}
            </div>
            <div className="w-px h-8 bg-dark-600" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Size</p>
              <p className="text-lg font-bold text-white">${size}</p>
            </div>
          </div>
        </div>

        {/* AI Sentiment Section */}
        <div className="px-4 py-3 border-t border-dark-700">
          {/* Sentiment meter */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-1">
              <span className="text-green-400 text-sm">+</span>
              <span className="text-xs font-medium text-green-400">{trade.sentiment.bullish}%</span>
            </div>
            <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                style={{ width: `${trade.sentiment.bullish}%` }}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-red-400">{100 - trade.sentiment.bullish}%</span>
              <span className="text-red-400 text-sm">-</span>
            </div>
          </div>

          {/* AI Summary */}
          <div className="flex items-start gap-2">
            <span className="text-xs">🤖</span>
            <p className="text-xs text-gray-400 leading-relaxed">
              {trade.sentiment.summary}
            </p>
          </div>
        </div>

        {/* News Section */}
        <NewsSection news={trade.news} />

        {/* Swipe hint */}
        <div className="px-4 pb-3 flex justify-between text-[10px] text-gray-600 border-t border-dark-700 pt-2">
          <span>← Skip</span>
          <span>Trade →</span>
        </div>
      </div>
    </div>
  );
}
