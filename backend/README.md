# HypeSwipe Backend

## Current Status

For the MVP, backend functionality is implemented via Next.js API routes in the `frontend` package:

- `frontend/app/api/vault/` - Vault balance management
- `frontend/app/api/lifi/` - Li.Fi integration for BTC→USDC swaps
- `frontend/lib/vault.ts` - In-memory vault storage
- `frontend/lib/lifi.ts` - Li.Fi API client

## Future Architecture

When scaling beyond MVP, this package will contain:

### Planned Services

1. **Vault Service**
   - PostgreSQL/Redis backed balance storage
   - Transaction history
   - Real-time balance updates via WebSocket

2. **Bridge Monitor Service**
   - Poll Li.Fi status endpoint for pending deposits
   - Automatic vault crediting on bridge completion
   - Retry logic and error handling

3. **Trading Service (Stub)**
   - Pear Protocol integration
   - Hyperliquid API integration
   - Order management
   - Position tracking

4. **Price Feed Service**
   - Real-time BTC/USDC prices
   - Multiple oracle aggregation

## API Endpoints (Planned)

```
POST /api/auth/verify - Verify wallet signature
GET  /api/vault/:address - Get vault balance
POST /api/vault/deposit/initiate - Start BTC deposit flow
POST /api/vault/deposit/track - Track pending deposit
POST /api/vault/withdraw - Withdraw to wallet

GET  /api/trades - List user trades
POST /api/trades - Execute trade (stub)
DELETE /api/trades/:id - Close position (stub)

WS   /ws/prices - Real-time price stream
WS   /ws/positions - Real-time position updates
```
