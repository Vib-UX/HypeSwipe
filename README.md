# HypeSwipe

A BTC-funded perpetuals trading app with swipe-to-trade UX.

## Overview

HypeSwipe allows users to:
1. Connect their MetaMask wallet (EVM + BTC)
2. Deposit BTC which is automatically converted to USDC
3. Trade perpetuals with a simple swipe interface (coming soon)

## Architecture

```
hypeswipe-monorepo/
├── frontend/          # Next.js app with API routes
│   ├── app/           # App Router pages and API
│   ├── components/    # React components
│   ├── hooks/         # React Query hooks
│   ├── lib/           # Li.Fi client, vault storage
│   ├── store/         # Zustand state management
│   └── types/         # TypeScript types
├── backend/           # Future dedicated backend (stub)
└── contracts/         # Future smart contracts (stub)
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Wallet**: Wagmi v2, Viem
- **State**: React Query, Zustand
- **API Integration**: Li.Fi HTTP API

## Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Features (MVP)

### ✅ Implemented

- [x] MetaMask wallet connection (EVM)
- [x] Manual BTC address input
- [x] In-memory vault balance tracking
- [x] Li.Fi quote API integration for BTC → USDC
- [x] Top-up flow with quote display
- [x] Simulated deposit crediting

### 🚧 Stubbed (Coming Soon)

- [ ] Real BTC transaction signing
- [ ] Li.Fi transaction status tracking
- [ ] Pear Protocol integration
- [ ] Hyperliquid integration
- [ ] Swipe-to-trade UI

## API Routes

### Vault

```
GET  /api/vault?address=<evmAddress>
     Returns: { equityUsdc: number }

POST /api/vault/credit
     Body: { address: string, amountUsdc: number }
     Returns: { equityUsdc: number }
```

### Li.Fi Integration

```
POST /api/lifi/quote-btc-to-usdc
     Body: {
       btcAddress: string,
       evmAddress: string,
       fromAmountSats: string,
       toChainId: number,      // 1 (Ethereum) or 42161 (Arbitrum)
       toToken: string         // USDC address
     }
     Returns: Li.Fi QuoteResponse with transactionRequest
```

## Li.Fi BTC → USDC Flow

Based on [Li.Fi Bitcoin Transaction Example](https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example):

1. **Get Quote**: Call `/quote` with BTC source and EVM destination
2. **Transaction Data**: Receive `transactionRequest` with:
   - `to`: BTC vault address (e.g., ThorSwap vault)
   - `value`: Amount in satoshis
   - `data`: Memo containing bridge routing info
3. **Sign & Send**: User signs BTC transaction in MetaMask
4. **Track Status**: Poll Li.Fi `/status` endpoint until complete
5. **Credit**: Once status is DONE, credit user's vault

## Production TODOs

### Security
- [ ] Add authentication (signature verification)
- [ ] Rate limiting on API routes
- [ ] Input sanitization and validation

### Infrastructure
- [ ] Persistent database (PostgreSQL/Redis)
- [ ] Background job processing for status tracking
- [ ] WebSocket for real-time updates

### Features
- [ ] Real BTC transaction support
- [ ] Transaction history
- [ ] Withdrawal functionality
- [ ] Trading integration

## Environment Variables

```env
# No env vars required for MVP (using public Li.Fi API)

# Future:
# DATABASE_URL=
# REDIS_URL=
# LIFI_API_KEY=
# HYPERLIQUID_API_KEY=
```

## Resources

- [Li.Fi Bitcoin Docs](https://docs.li.fi/introduction/lifi-architecture/bitcoin-overview)
- [Li.Fi Transaction Example](https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example)
- [Wagmi Documentation](https://wagmi.sh/)
- [TanStack Query](https://tanstack.com/query/latest)

## License

Private - All rights reserved
