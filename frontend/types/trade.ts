export interface MarketMetrics {
  openInterest: string;
  volume: string;
  change24h: string;
  netFunding: string;
}

export interface TradeCard {
  id: string;
  ticker: string;
  direction: "LONG" | "SHORT";
  timeframe: "4h" | "1d";
  leverage: number; // 1-5x randomized
  candles: CandleData[];
  sentiment: SentimentData;
  news: NewsItem[];

  positionType?: PositionType;
  longAssets?: MarketAsset[];
  shortAssets?: MarketAsset[];
  marketMetrics?: MarketMetrics;
}

export interface SentimentData {
  bullish: number; // 0-100 percentage
  summary: string; // Short AI summary
}

export interface NewsItem {
  title: string;
  source: string;
  time: string; // e.g. "2h ago"
  sentiment: "positive" | "negative" | "neutral";
}

export interface CandleData {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface MarketAsset {
  asset: string;
  weight: number;
}

export type PositionType = "relative_pair" | "one_directional";

export interface PearMarket {
  longAssets: MarketAsset[];
  shortAssets: MarketAsset[];
  openInterest: string;
  volume: string;
  ratio: string;
  change24h: string;
  weightedChange24h: string;
  netFunding: string;
  positionType: PositionType;
  displayName: string;
}

export interface AISignal {
  sentiment: string;
  bullishPercent: number;
  leverage: number;
  direction?: "LONG" | "SHORT";
  reasoning: string;
}

// Available tickers on Hyperliquid
export const TICKERS = ["BTC", "ETH", "SOL", "HYPE", "PURR"] as const;

// Mock news per ticker (will be replaced with CryptoPanic API)
const MOCK_NEWS: Record<string, NewsItem[]> = {
  BTC: [
    {
      title: "Bitcoin ETF sees record $1.2B inflows",
      source: "CoinDesk",
      time: "2h",
      sentiment: "positive",
    },
    {
      title: "MicroStrategy buys another 5,000 BTC",
      source: "Bloomberg",
      time: "4h",
      sentiment: "positive",
    },
    {
      title: "Fed signals potential rate cuts in Q2",
      source: "Reuters",
      time: "6h",
      sentiment: "positive",
    },
    {
      title: "Whale moves 10K BTC to exchange",
      source: "Whale Alert",
      time: "8h",
      sentiment: "negative",
    },
  ],
  ETH: [
    {
      title: "Ethereum L2 TVL hits new all-time high",
      source: "DeFiLlama",
      time: "1h",
      sentiment: "positive",
    },
    {
      title: "Vitalik proposes new scaling roadmap",
      source: "Decrypt",
      time: "3h",
      sentiment: "positive",
    },
    {
      title: "ETH staking rewards increase to 4.2%",
      source: "Lido",
      time: "5h",
      sentiment: "neutral",
    },
    {
      title: "Major protocol upgrade scheduled",
      source: "Ethereum.org",
      time: "12h",
      sentiment: "positive",
    },
  ],
  SOL: [
    {
      title: "Solana processes 50K TPS in stress test",
      source: "Solana Labs",
      time: "2h",
      sentiment: "positive",
    },
    {
      title: "New memecoin launches drive fees up",
      source: "The Block",
      time: "4h",
      sentiment: "neutral",
    },
    {
      title: "Phantom wallet hits 10M users",
      source: "CryptoSlate",
      time: "6h",
      sentiment: "positive",
    },
    {
      title: "Jupiter DEX volume surpasses Uniswap",
      source: "DeFiLlama",
      time: "8h",
      sentiment: "positive",
    },
  ],
  HYPE: [
    {
      title: "Hyperliquid volume hits $2B daily",
      source: "DefiLlama",
      time: "1h",
      sentiment: "positive",
    },
    {
      title: "New perpetuals pairs added",
      source: "Hyperliquid",
      time: "3h",
      sentiment: "positive",
    },
    {
      title: "Airdrop rumors circulating on CT",
      source: "Twitter",
      time: "5h",
      sentiment: "neutral",
    },
    {
      title: "Top traders migrating from CEX",
      source: "The Block",
      time: "10h",
      sentiment: "positive",
    },
  ],
  PURR: [
    {
      title: "Cat coin narrative gaining traction",
      source: "CoinGecko",
      time: "2h",
      sentiment: "positive",
    },
    {
      title: "Community votes on new tokenomics",
      source: "Snapshot",
      time: "4h",
      sentiment: "neutral",
    },
    {
      title: "Listed on new CEX exchange",
      source: "CryptoNews",
      time: "8h",
      sentiment: "positive",
    },
    {
      title: "Influencer promotes to 500K followers",
      source: "Twitter",
      time: "12h",
      sentiment: "positive",
    },
  ],
};

// Mock AI summaries per ticker (will be replaced with real AI later)
const MOCK_SUMMARIES: Record<string, string[]> = {
  BTC: [
    "Strong momentum, breaking key resistance",
    "Consolidating near ATH, watch for breakout",
    "Whale accumulation detected on-chain",
  ],
  ETH: [
    "ETF inflows driving price action",
    "L2 activity surging, bullish setup",
    "Testing support, could bounce here",
  ],
  SOL: [
    "DeFi TVL hitting new highs",
    "Memecoin szn boosting volume",
    "Network upgrades coming, devs bullish",
  ],
  HYPE: [
    "Volume spike, something brewing",
    "Community sentiment very strong",
    "New listings incoming per rumors",
  ],
  PURR: [
    "Cat szn narrative picking up",
    "Low cap gem, high risk high reward",
    "Whale wallet moved, watch closely",
  ],
};

// Generate random leverage 1-5x
export function randomLeverage(): number {
  return Math.floor(Math.random() * 5) + 1;
}

// Generate random sentiment
export function randomSentiment(ticker: string): SentimentData {
  const bullish = Math.floor(Math.random() * 40) + 45; // 45-85% range
  const summaries = MOCK_SUMMARIES[ticker] || MOCK_SUMMARIES["BTC"];
  const summary = summaries[Math.floor(Math.random() * summaries.length)];
  return { bullish, summary };
}

// Get news for ticker
export function getNewsForTicker(ticker: string): NewsItem[] {
  return MOCK_NEWS[ticker] || MOCK_NEWS["BTC"];
}

// Generate trade scenarios
export function generateTradeScenarios(): Omit<TradeCard, "candles">[] {
  const scenarios: Omit<TradeCard, "candles">[] = [];
  const directions: ("LONG" | "SHORT")[] = ["LONG", "SHORT"];
  const timeframes: ("4h" | "1d")[] = ["4h", "1d"];

  TICKERS.forEach((ticker, i) => {
    scenarios.push({
      id: String(i + 1),
      ticker,
      direction: directions[Math.floor(Math.random() * 2)],
      timeframe: timeframes[Math.floor(Math.random() * 2)],
      leverage: randomLeverage(),
      sentiment: randomSentiment(ticker),
      news: getNewsForTicker(ticker),
    });
  });

  return scenarios;
}
