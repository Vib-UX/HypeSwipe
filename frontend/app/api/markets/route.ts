import { NextResponse } from "next/server";
import { pearApiRequest, PearApiException } from "@/lib/pear-api";
import { detectPositionType, generateDisplayName } from "@/lib/market-utils";
import type { PearMarket, MarketAsset } from "@/types/trade";

interface RawPearMarket {
  longAssets: MarketAsset[];
  shortAssets: MarketAsset[];
  openInterest: string;
  volume: string;
  ratio: string;
  change24h: string;
  weightedChange24h: string;
  netFunding: string;
}

interface PearMarketResponse {
  markets: RawPearMarket[];
}

const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheEntry {
  data: PearMarket[];
  timestamp: number;
}

let marketsCache: CacheEntry | null = null;

function isCacheValid(): boolean {
  if (!marketsCache) {
    return false;
  }
  const now = Date.now();
  return now - marketsCache.timestamp < CACHE_TTL_MS;
}

/**
 * Transform raw Pear API response to internal PearMarket format.
 * Calculates positionType and generates displayName for each market.
 */
function transformMarkets(rawMarkets: RawPearMarket[]): PearMarket[] {
  return rawMarkets.map((market) => {
    const positionType = detectPositionType(
      market.longAssets,
      market.shortAssets,
    );
    const displayName = generateDisplayName(
      market.longAssets,
      market.shortAssets,
      positionType,
    );

    return {
      longAssets: market.longAssets,
      shortAssets: market.shortAssets,
      openInterest: market.openInterest,
      volume: market.volume,
      ratio: market.ratio,
      change24h: market.change24h,
      weightedChange24h: market.weightedChange24h,
      netFunding: market.netFunding,
      positionType,
      displayName,
    };
  });
}

export async function GET() {
  try {
    if (isCacheValid() && marketsCache) {
      return NextResponse.json({ markets: marketsCache.data });
    }

    const data = await pearApiRequest<PearMarketResponse>(
      "/markets",
      { method: "GET" },
      false,
    );

    const transformedMarkets = transformMarkets(data.markets);

    marketsCache = {
      data: transformedMarkets,
      timestamp: Date.now(),
    };

    return NextResponse.json({ markets: transformedMarkets });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Markets fetch error:", {
      message: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    });

    if (marketsCache) {
      const cacheAgeMs = Date.now() - marketsCache.timestamp;
      const cacheAgeMinutes = Math.round(cacheAgeMs / 60000);
      console.warn(
        `Returning stale cache data (${cacheAgeMinutes} minutes old) due to fetch error: ${errorMessage}`,
      );
      return NextResponse.json({
        markets: marketsCache.data,
        stale: true,
        cacheAgeMinutes,
      });
    }

    if (error instanceof PearApiException) {
      console.error(
        `PearApiException: status=${error.statusCode}, details=`,
        error.details,
      );
      return NextResponse.json(
        {
          error: error.message,
          code: "PEAR_API_ERROR",
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch markets. Please try again later.",
        code: "MARKETS_FETCH_ERROR",
      },
      { status: 500 },
    );
  }
}
