export interface MarketMetrics {
  openInterest: string;
  volume: string;
  change24h: string;
  netFunding: string;
}

export interface TradeCard {
  id: string;
  ticker: string;
  tagline: string;
  direction: "LONG" | "SHORT";
  timeframe: "4h" | "1d";
  leverage: number;
  candles: CandleData[];
  sentiment: SentimentData;
  news: NewsItem[];

  positionType?: PositionType;
  longAssets?: MarketAsset[];
  shortAssets?: MarketAsset[];
  marketMetrics?: MarketMetrics;
}

export interface SentimentData {
  bullish: number;
  summary: string;
  leverage?: number;
  leverageReasoning?: string;
}

export interface NewsItem {
  title: string;
  source: string;
  time: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface CandleData {
  time: number;
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

export interface AITradeIdea {
  marketIndex: number; // Reference to original market in batch
  tagline: string; // Short 2-3 word tagline (e.g., "Bull Run", "Breakout Play")
  direction: "LONG" | "SHORT";
  leverage: number;
  sentiment: string;
  bullishPercent: number;
  reasoning: string;
}
