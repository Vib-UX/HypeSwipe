'use client';

import { useRef, useState } from 'react';
import { MiniChart } from './MiniChart';
import type { TradeCard } from '@/types/trade';

interface SwipeCardProps {
  trade: TradeCard;
  size: number;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

export function SwipeCard({ trade, size, onSwipe, isTop }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState({ x: 0, startX: 0, isDragging: false });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-200">{trade.ticker.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{trade.ticker}</h3>
              <p className="text-xs text-gray-500">{trade.timeframe.toUpperCase()} Chart</p>
            </div>
          </div>
          <div
            className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
              trade.direction === 'LONG'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {trade.direction === 'LONG' ? '↑' : '↓'} {trade.direction}
          </div>
        </div>

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
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Leverage</p>
              <p className="text-lg font-bold text-primary-400">{trade.leverage}x</p>
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
              <span className="text-green-400 text-sm">📈</span>
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
              <span className="text-red-400 text-sm">📉</span>
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

        {/* News Section - Scrollable */}
        <div className="border-t border-dark-700">
          <div className="px-4 py-2 flex items-center gap-2">
            <span className="text-xs">📰</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Latest News</span>
          </div>
          <div className="px-4 pb-3">
            <div className="space-y-2">
              {trade.news.map((item, idx) => (
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
                      {item.source} · {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Swipe hint */}
        <div className="px-4 pb-3 flex justify-between text-[10px] text-gray-600 border-t border-dark-700 pt-2">
          <span>← Skip</span>
          <span>Trade →</span>
        </div>
      </div>
    </div>
  );
}
