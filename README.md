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
- **Execution**: Hyperliquid via Peer Protocol
- **Funding**: Native BTC + Lightning → USDC
- **Bridging**: Li.Fi for BTC → Hyperliquid USDC

## Funding Options

### 1. Native BTC (Xverse)
- Connect Xverse wallet
- Send BTC on-chain
- Auto-bridged to USDC via Li.Fi
- ~20 minute settlement

### 2. Lightning (Alby) - Coming Soon
- Pay Lightning invoice
- LSAT tokens minted on HyperEVM
- Instant swap to USDC
- ~15 second settlement

## Progress

**Done:**
- [x] EVM wallet connection (MetaMask)
- [x] BTC wallet connection (Xverse)
- [x] Li.Fi BTC → USDC bridging
- [x] Hyperliquid chain support
- [x] Auto-quote fetching
- [x] Balance tracking

**Building:**
- [ ] Lightning integration (LSAT/USDC pool)
- [ ] Swipe card UI
- [ ] AI position generation
- [ ] Peer Protocol integration

**Next:**
- [ ] Mobile gestures
- [ ] Position tracking
- [ ] P&L visualization
- [ ] Social features

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp frontend/.env.example frontend/.env.local
# Add your LIFI_API_KEY

# Run development server
npm run dev
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/vault` | GET | Get user's USDC balance |
| `/api/vault/credit` | POST | Credit USDC to user (dev) |
| `/api/lifi/quote-btc-to-usdc` | POST | Get BTC → USDC quote |

## Architecture

```
User
  │
  ├─ Native BTC ──→ Xverse ──→ Li.Fi Bridge ──→ Hyperliquid USDC
  │                              (~20 min)
  │
  └─ Lightning ──→ Alby ──→ LSAT Mint ──→ DEX Swap ──→ Hyperliquid USDC
                            (~15 sec)
```

## Links

- [Hyperliquid Docs](https://hyperliquid.gitbook.io/)
- [Li.Fi API](https://docs.li.fi/)
- [Peer Protocol](https://docs.pear.garden/)

---

**Not financial advice. Gamified leverage trading carries significant risk.**
