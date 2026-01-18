import { NextResponse } from "next/server";
import { detectPositionType, generateDisplayName } from "@/lib/market-utils";
import type { PearMarket, MarketAsset } from "@/types/trade";

const PEAR_API_BASE_URL = "https://hl-v2.pearprotocol.io";
const DEFAULT_PAGE_SIZE = 6;

interface RawPearMarket {
  name: string;
  openInterest?: number;
  volume?: number;
  ratio?: number | null;
  change24h?: number | null;
  weightedChange24h?: number | null;
  netFunding?: number;
}

function parseMarketName(name: string): { longAssets: MarketAsset[]; shortAssets: MarketAsset[] } {
  const longAssets: MarketAsset[] = [];
  const shortAssets: MarketAsset[] = [];

  const parts = name.split("|");

  for (const part of parts) {
    if (part.startsWith("L:")) {
      const assets = part.slice(2).split(",");
      const weight = 100 / assets.length;
      for (const asset of assets) {
        if (asset.trim()) {
          longAssets.push({ asset: asset.trim(), weight });
        }
      }
    } else if (part.startsWith("S:")) {
      const assets = part.slice(2).split(",");
      const weight = 100 / assets.length;
      for (const asset of assets) {
        if (asset.trim()) {
          shortAssets.push({ asset: asset.trim(), weight });
        }
      }
    }
  }

  return { longAssets, shortAssets };
}

function transformMarkets(rawMarkets: RawPearMarket[]): PearMarket[] {
  return rawMarkets.map((market) => {
    const { longAssets, shortAssets } = parseMarketName(market.name);

    const positionType = detectPositionType(longAssets, shortAssets);
    const displayName = generateDisplayName(longAssets, shortAssets, positionType);

    return {
      longAssets,
      shortAssets,
      openInterest: String(market.openInterest ?? 0),
      volume: String(market.volume ?? 0),
      ratio: String(market.ratio ?? 0),
      change24h: String(market.weightedChange24h ?? market.change24h ?? 0),
      weightedChange24h: String(market.weightedChange24h ?? 0),
      netFunding: String(market.netFunding ?? 0),
      positionType,
      displayName,
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const response = await fetch(
      `${PEAR_API_BASE_URL}/markets?page=${page}&pageSize=${DEFAULT_PAGE_SIZE}&engine=hyperliquid`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Pear API error: ${response.status}`);
    }

    const data = await response.json();
    const rawMarkets: RawPearMarket[] = data.markets ?? [];
    const transformedMarkets = transformMarkets(rawMarkets);

    return NextResponse.json({
      markets: transformedMarkets,
      page: data.page ?? page,
      totalPages: data.totalPages ?? 1,
      hasMore: page < (data.totalPages ?? 1),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Markets fetch error:", errorMessage);

    return NextResponse.json(
      {
        error: errorMessage || "Failed to fetch markets. Please try again later.",
        code: "MARKETS_FETCH_ERROR",
      },
      { status: 500 }
    );
  }
}
