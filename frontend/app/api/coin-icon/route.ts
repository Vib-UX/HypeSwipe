import { NextResponse } from "next/server";

const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Symbol mappings for assets that don't match CoinGecko's naming
const SYMBOL_MAP: Record<string, string> = {
  // Hyperliquid symbols -> CoinGecko search terms
  "purr": "purr-2",
  "hype": "hyperliquid",
  "ksol": "solana",
  "kpepe": "pepe",
  "kbonk": "bonk",
  "arb": "arbitrum",
  "cc": "cloudcoin",
  "doge": "dogecoin",
  "sol": "solana",
  "zen": "horizen",
  "stable": "tether",
  "xpl": "xpl",
};

// Cache coin image URLs (symbol -> imageUrl)
const iconCache = new Map<string, string | null>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cacheTimestamps = new Map<string, number>();

function isCacheValid(symbol: string): boolean {
  const timestamp = cacheTimestamps.get(symbol);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE_TTL_MS;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSymbol = searchParams.get("symbol")?.toLowerCase();

  if (!rawSymbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  // Check cache first
  if (isCacheValid(rawSymbol) && iconCache.has(rawSymbol)) {
    return NextResponse.json({ imageUrl: iconCache.get(rawSymbol) });
  }

  // Use mapped symbol if available
  const searchSymbol = SYMBOL_MAP[rawSymbol] || rawSymbol;

  try {
    const searchRes = await fetch(
      `${COINGECKO_API}/search?query=${encodeURIComponent(searchSymbol)}`,
      { headers: { accept: "application/json" } }
    );

    if (!searchRes.ok) {
      throw new Error("CoinGecko search failed");
    }

    const searchData = await searchRes.json();
    const coins = searchData.coins || [];

    // Try exact symbol match first
    let coin = coins.find(
      (c: { symbol: string }) => c.symbol.toLowerCase() === searchSymbol
    );

    // If no exact match, try original symbol
    if (!coin && searchSymbol !== rawSymbol) {
      coin = coins.find(
        (c: { symbol: string }) => c.symbol.toLowerCase() === rawSymbol
      );
    }

    // If still no match, take first result if it seems relevant
    if (!coin && coins.length > 0) {
      coin = coins[0];
    }

    if (coin?.thumb) {
      const imageUrl = coin.large || coin.thumb.replace("/thumb/", "/large/");
      iconCache.set(rawSymbol, imageUrl);
      cacheTimestamps.set(rawSymbol, Date.now());
      return NextResponse.json({ imageUrl });
    }

    // No match found
    iconCache.set(rawSymbol, null);
    cacheTimestamps.set(rawSymbol, Date.now());
    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    console.error("CoinGecko fetch error:", error);
    return NextResponse.json({ imageUrl: null });
  }
}
