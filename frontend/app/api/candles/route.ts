import { NextResponse } from "next/server";

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

let validCoinsCache: { coins: Set<string>; timestamp: number } | null = null;
const COINS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getValidCoins(): Promise<Set<string>> {
  const now = Date.now();

  if (validCoinsCache && now - validCoinsCache.timestamp < COINS_CACHE_TTL) {
    return validCoinsCache.coins;
  }

  try {
    const response = await fetch(HYPERLIQUID_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch meta");
    }

    const data = await response.json();
    const coins = new Set<string>(
      data.universe?.map((asset: { name: string }) => asset.name) ?? []
    );

    validCoinsCache = { coins, timestamp: now };
    return coins;
  } catch (error) {
    return validCoinsCache?.coins ?? new Set();
  }
}

export async function POST(request: Request) {
  try {
    const { coin, interval } = await request.json();

    const validCoins = await getValidCoins();
    if (validCoins.size > 0 && !validCoins.has(coin)) {
      return NextResponse.json({ candles: [] });
    }

    const now = Date.now();
    const intervalMs = getIntervalMs(interval);
    const startTime = now - 50 * intervalMs;

    const response = await fetch(HYPERLIQUID_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin,
          interval,
          startTime,
          endTime: now,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ candles: [] });
    }

    const data = await response.json();

    const candles = data.map((c: { t: number; o: string; h: string; l: string; c: string }) => ({
      time: Math.floor(c.t / 1000),
      open: parseFloat(c.o),
      high: parseFloat(c.h),
      low: parseFloat(c.l),
      close: parseFloat(c.c),
    }));

    return NextResponse.json({ candles });
  } catch (error) {
    console.error("Candle fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch candles" },
      { status: 500 },
    );
  }
}

function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  };
  return map[interval] || 4 * 60 * 60 * 1000;
}
