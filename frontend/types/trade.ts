export interface TradeCard {
  id: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  timeframe: '4h' | '1d';
  leverage: number; // 1-5x randomized
  candles: CandleData[];
}

export interface CandleData {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// Available tickers on Hyperliquid
export const TICKERS = ['BTC', 'ETH', 'SOL', 'HYPE', 'PURR'] as const;

// Generate random leverage 1-5x
export function randomLeverage(): number {
  return Math.floor(Math.random() * 5) + 1;
}

// Generate trade scenarios
export function generateTradeScenarios(): Omit<TradeCard, 'candles'>[] {
  const scenarios: Omit<TradeCard, 'candles'>[] = [];
  const directions: ('LONG' | 'SHORT')[] = ['LONG', 'SHORT'];
  const timeframes: ('4h' | '1d')[] = ['4h', '1d'];

  TICKERS.forEach((ticker, i) => {
    scenarios.push({
      id: String(i + 1),
      ticker,
      direction: directions[Math.floor(Math.random() * 2)],
      timeframe: timeframes[Math.floor(Math.random() * 2)],
      leverage: randomLeverage(),
    });
  });

  return scenarios;
}
