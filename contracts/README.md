# HypeSwipe Contracts

## Current Status

For the MVP, no smart contracts are required. The flow is:

1. User sends BTC to Li.Fi bridge vault
2. Li.Fi routes BTC → USDC via ThorSwap/Chainflip/etc.
3. USDC arrives at user's EVM address
4. Backend credits internal vault balance

## Future Architecture

When implementing full trading features, this package may contain:

### Potential Contracts

1. **Vault Contract**
   - On-chain vault for user deposits
   - Multi-sig withdrawals
   - Emergency pause functionality

2. **Trading Proxy**
   - Interface with Hyperliquid/Pear
   - Position management
   - Liquidation handling

3. **Fee Distribution**
   - Protocol fee collection
   - Revenue sharing

## Supported Networks (Planned)

- Arbitrum One (primary)
- Ethereum Mainnet (for larger positions)

## Development Setup

```bash
# When contracts are added:
npm install
npm run compile
npm run test
npm run deploy:testnet
```
