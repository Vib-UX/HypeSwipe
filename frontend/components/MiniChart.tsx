'use client';

import { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import type { CandleData } from '@/types/trade';

interface MiniChartProps {
  candles: CandleData[];
  direction: 'LONG' | 'SHORT';
}

// Simple EMA calculation
function calculateEMA(data: CandleData[], period: number) {
  const k = 2 / (period + 1);
  const emaData: { time: number; value: number }[] = [];
  let ema = data[0]?.close || 0;

  for (const candle of data) {
    ema = candle.close * k + ema * (1 - k);
    emaData.push({ time: candle.time, value: ema });
  }

  return emaData;
}

export function MiniChart({ candles, direction }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderVisible: false,
        visible: false,
      },
      crosshair: {
        mode: 0, // Disabled
      },
      handleScale: false,
      handleScroll: false,
    });

    chartRef.current = chart;

    // Candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const chartData = candles.map((c) => ({
      time: c.time as number,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    candleSeries.setData(chartData);

    // EMA 20 overlay (v5 API)
    const emaSeries = chart.addSeries(LineSeries, {
      color: direction === 'LONG' ? '#f19340' : '#818cf8',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    emaSeries.setData(calculateEMA(candles, 20));

    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles, direction]);

  return <div ref={containerRef} className="w-full h-full" />;
}
