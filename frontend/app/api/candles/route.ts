import { NextResponse } from 'next/server';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

export async function POST(request: Request) {
  try {
    const { coin, interval } = await request.json();

    // Calculate time range: last 50 candles
    const now = Date.now();
    const intervalMs = getIntervalMs(interval);
    const startTime = now - 50 * intervalMs;

    const response = await fetch(HYPERLIQUID_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'candleSnapshot',
        req: {
          coin,
          interval,
          startTime,
          endTime: now,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Hyperliquid format to our format
    // Hyperliquid: { t, o, h, l, c } where t is ms, prices are strings
    const candles = data.map((c: any) => ({
      time: Math.floor(c.t / 1000), // Convert ms to seconds for lightweight-charts
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
    }));

    return NextResponse.json({ candles });
  } catch (error) {
    console.error('Candle fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch candles' }, { status: 500 });
  }
}

function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return map[interval] || 4 * 60 * 60 * 1000;
}
