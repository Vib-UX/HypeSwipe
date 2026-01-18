# HypeSwipe

**Tinder for Trading.** Swipe through positions, bet small, think fast. Built on Hyperliquid.

## What is HypeSwipe?

HypeSwipe is a mobile-first trading experience that turns leverage trading into a swipeable feed. Instead of complex order books and charts, users swipe through position cards—each representing a trade setup with:

- **Asset**: BTC, ETH, or other majors
- **Chart**: 4H or 1D pattern visualization
- **Leverage**: AI-suggested 2x-50x
- **Direction**: Long or short bias
- **Sentiment**: AI-summarized news and social signals
- **Size**: Capped at $10 per swipe

Swipe right to bet. Swipe left to skip. That's it.

## Live Transactions

Proof of working funding flows:

| Method | Transaction | Explorer |
|--------|-------------|----------|
| Lightning | 10 sats deposit | Alby WebLN |
| Arbitrum → Hyperliquid | 2.44 USDC bridge | [Arbiscan](https://arbiscan.io/tx/0xb793382502c5d5b63ef714fa1b1d3dbbe044ef1b5710bd1ef17cf68655b48822) |
| Bitcoin (on-chain) | SegWit + Taproot | [Mempool](https://mempool.space/tx/f6bf9f1b67729c5cd7dd526700c3714cca9a5f6bd079f2e54d58c8945d0cab3a) |

### Lightning Payment
<img width="400" alt="Lightning Payment" src="https://github.com/user-attachments/assets/39d13aa5-78cb-4390-9095-c40adea3f2ed" />

### Arbitrum → Hyperliquid Bridge
<img width="800" alt="Arbitrum Bridge" src="https://github.com/user-attachments/assets/d98643ff-fbf2-45bd-9964-9972f3131965" />

### Bitcoin On-Chain Transaction
<img width="800" alt="Bitcoin Transaction" src="https://github.com/user-attachments/assets/9c21caa1-c27c-4895-9e08-b7843951f2b4" />

### Pear Protocol APIs
<img width="800" alt="Pear Protocol" src="https://github.com/user-attachments/assets/d3db8b27-8beb-4da0-98a6-15952ddea262" />

## Why?

Traditional perps trading has too much friction:
- Complex UIs designed for pros
- Analysis paralysis from too many options
- Fear of large losses discourages participation

HypeSwipe flips this:
- **Gamified**: Trading feels like a game, not finance
- **Micro bets**: $10 max per swipe = low stress
- **High volume**: Quick decisions, many positions
- **Intuitive**: Visual, emotional, fast

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Execution**: Hyperliquid via Pear Protocol
- **Funding**: Native BTC, Lightning, Arbitrum USDC
- **Bridging**: Li.Fi Widget for cross-chain swaps

## Funding Options

### 1. Lightning Network (Alby)
- Connect Alby wallet via WebLN
- Pay Lightning invoice instantly
- USDC credited to trading account
- **~15 second settlement**

### 2. Native BTC (Li.Fi Widget)
- Connect BTC wallet (Xverse, etc.)
- Send BTC on-chain
- Auto-bridged to Hyperliquid USDC via Li.Fi
- **~20 minute settlement**

### 3. Arbitrum USDC (Li.Fi Widget)
- Connect MetaMask on Arbitrum
- Bridge USDC directly to Hyperliquid L1
- One-click deposit to perps account
- **~2 minute settlement**

## Features

- [x] EVM wallet connection (MetaMask)
- [x] BTC wallet connection (Xverse)
- [x] Lightning wallet connection (Alby/WebLN)
- [x] Li.Fi Widget integration
- [x] Arbitrum USDC → Hyperliquid L1 bridging
- [x] Native BTC → Hyperliquid USDC bridging
- [x] Lightning instant deposits
- [x] Hyperliquid balance tracking (spot + perps)
- [x] Real-time vault balance updates
- [x] Swipe card UI with charts
- [x] AI market signal generation

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp frontend/.env.example frontend/.env.local
# Add your NEXT_PUBLIC_LIFI_API_KEY

# Run development server
npm run dev

# Run Lightning backend (optional)
cd backend && npm run dev
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vault` | GET | Get user's USDC balance |
| `/api/vault/credit` | POST | Credit USDC to user |
| `/api/lifi/quote-btc-to-usdc` | POST | Get BTC → USDC quote |
| `/api/lightning/create-invoice` | POST | Create Lightning invoice |
| `/api/lightning/verify-payment` | POST | Verify Lightning payment |
| `/api/ai/market-signal` | POST | Generate AI trading signal |

## Architecture

```
User
  │
  ├─ Lightning ──→ Alby/WebLN ──→ Invoice ──→ Verify ──→ Credit USDC
  │                                (~15 sec)
  │
  ├─ Native BTC ──→ Li.Fi Widget ──→ Bridge ──→ Hyperliquid USDC
  │                                  (~20 min)
  │
  └─ Arbitrum USDC ──→ Li.Fi Widget ──→ Relay ──→ Hyperliquid L1 Perps
                                        (~2 min)
```

## Links

- [Hyperliquid Docs](https://hyperliquid.gitbook.io/)
- [Li.Fi Widget](https://docs.li.fi/widget/overview)
- [Li.Fi API](https://docs.li.fi/)
- [Alby WebLN](https://guides.getalby.com/developer-guide/v/alby-wallet-api-and-oauth/reference/webln-reference)

---

**Not financial advice. Gamified leverage trading carries significant risk.**
