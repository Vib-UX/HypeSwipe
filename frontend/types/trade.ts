export interface TradeCard {
  id: string;
  ticker: string;
  direction: 'LONG' | 'SHORT';
  timeframe: '4H' | '1D';
  leverage: number;
  size: number; // in USD, capped at $10
  entryPrice: number;
  // Demo chart data
  candles: CandleData[];
}

export interface CandleData {
  time: number; // unix timestamp in seconds
  open: number;
  high: number;
  close: number;
  low: number;
}

// Demo data for MVP
export const DEMO_TRADES: TradeCard[] = [
  {
    id: '1',
    ticker: 'BTC',
    direction: 'LONG',
    timeframe: '4H',
    leverage: 5,
    size: 10,
    entryPrice: 97500,
    candles: generateDemoCandles(97000, 0.02, 40),
  },
  {
    id: '2',
    ticker: 'ETH',
    direction: 'SHORT',
    timeframe: '1D',
    leverage: 3,
    size: 8,
    entryPrice: 3450,
    candles: generateDemoCandles(3400, 0.03, 40),
  },
  {
    id: '3',
    ticker: 'SOL',
    direction: 'LONG',
    timeframe: '4H',
    leverage: 10,
    size: 5,
    entryPrice: 195,
    candles: generateDemoCandles(190, 0.04, 40),
  },
  {
    id: '4',
    ticker: 'HYPE',
    direction: 'LONG',
    timeframe: '1D',
    leverage: 5,
    size: 10,
    entryPrice: 24.5,
    candles: generateDemoCandles(23, 0.06, 40),
  },
  {
    id: '5',
    ticker: 'PUMP',
    direction: 'SHORT',
    timeframe: '4H',
    leverage: 2,
    size: 7,
    entryPrice: 8.2,
    candles: generateDemoCandles(8.5, 0.08, 40),
  },
];

// Generate demo candle data
function generateDemoCandles(basePrice: number, volatility: number, count: number): CandleData[] {
  const candles: CandleData[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const interval = 4 * 60 * 60; // 4 hours in seconds

  for (let i = count; i > 0; i--) {
    const change = (Math.random() - 0.48) * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;

    candles.push({
      time: now - i * interval,
      open,
      high,
      low,
      close,
    });

    price = close;
  }

  return candles;
}
