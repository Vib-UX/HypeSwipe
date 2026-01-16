import { NextRequest, NextResponse } from 'next/server';
import { getBtcToEvmQuote, LifiApiError } from '@/lib/lifi';
import type { LifiQuoteRequest, LifiQuoteResponse } from '@/types';
import { SUPPORTED_EVM_CHAINS, NATIVE_TOKEN_ADDRESS } from '@/types';

/**
 * POST /api/lifi/quote-btc-to-usdc
 * 
 * Gets a quote for swapping BTC to USDC on an EVM chain via Li.Fi.
 * 
 * Body: {
 *   btcAddress: string;      // User's BTC address
 *   evmAddress: string;      // User's EVM address (destination)
 *   fromAmountSats: string;  // Amount in satoshis
 *   toChainId: number;       // 1 (Ethereum) or 42161 (Arbitrum)
 *   toToken: string;         // USDC address or 0x0 for native
 * }
 * 
 * Returns the Li.Fi quote including transactionRequest:
 * - to: BTC vault address to send funds to
 * - value: Amount in satoshis
 * - data: Memo/PSBT data for the bridge
 * 
 * PRODUCTION NOTES:
 * ==================
 * In a real implementation, after returning the quote:
 * 
 * 1. Frontend would prompt user to sign BTC transaction in MetaMask
 *    (using MetaMask BTC Snap or native BTC support)
 * 
 * 2. After user signs and broadcasts the BTC transaction, frontend would
 *    call a separate endpoint with the txHash
 * 
 * 3. Backend would poll Li.Fi /status endpoint:
 *    GET /status?txHash=<btcTxHash>&fromChain=BTC&toChain=<evmChainId>
 *    until status === 'DONE'
 * 
 * 4. Only when status is DONE, credit the vault with the actual received amount
 * 
 * For this MVP, we simulate success by immediately crediting after quote.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LifiQuoteRequest;

    // Validate required fields
    if (!body.btcAddress || !body.evmAddress || !body.fromAmountSats || !body.toChainId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: btcAddress, evmAddress, fromAmountSats, toChainId',
          received: body 
        },
        { status: 400 }
      );
    }

    // Validate BTC address format (basic check for common formats)
    const btcAddressRegex = /^(bc1|[13]|tb1)[a-zA-HJ-NP-Z0-9]{25,62}$/;
    if (!btcAddressRegex.test(body.btcAddress)) {
      return NextResponse.json(
        { error: 'Invalid BTC address format' },
        { status: 400 }
      );
    }

    // Validate EVM address
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.evmAddress)) {
      return NextResponse.json(
        { error: 'Invalid EVM address format' },
        { status: 400 }
      );
    }

    // Validate chain ID
    const supportedChainIds = SUPPORTED_EVM_CHAINS.map(c => c.id) as number[];
    if (!supportedChainIds.includes(body.toChainId)) {
      return NextResponse.json(
        { error: `Unsupported chain ID. Supported: ${supportedChainIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate amount (must be positive integer string)
    const amountSats = parseInt(body.fromAmountSats, 10);
    if (isNaN(amountSats) || amountSats <= 0) {
      return NextResponse.json(
        { error: 'fromAmountSats must be a positive integer string' },
        { status: 400 }
      );
    }

    // Use provided toToken or default to native token
    const toToken = body.toToken || NATIVE_TOKEN_ADDRESS;

    // Slippage: default to 1% for BTC bridges (they need higher due to confirmation times)
    // Chainflip often recommends 1%+ slippage
    const slippage = body.slippage ?? 0.01;

    // Call Li.Fi API to get quote
    const quote = await getBtcToEvmQuote({
      fromAddress: body.btcAddress,
      fromAmount: body.fromAmountSats,
      toChainId: body.toChainId,
      toAddress: body.evmAddress,
      toToken: toToken,
      slippage: slippage,
    });

    /**
     * PRODUCTION IMPLEMENTATION NOTES:
     * 
     * The quote.transactionRequest contains:
     * - to: The BTC vault address (e.g., ThorSwap vault)
     * - value: Amount in satoshis to send
     * - data: Memo containing bridge routing info
     * 
     * Example from Li.Fi docs:
     * {
     *   "to": "bc1qawcdxplxprc64fh38ryy4crndmfgwrffpac743",
     *   "data": "=:ETH.USDC:0x29DaCdF7cCaDf4eE67c923b4C22255A4B2494eD7::lifi:0|0x4977d81c2a5d6bd8",
     *   "value": "500000"
     * }
     * 
     * Next steps in production:
     * 1. Return this to frontend
     * 2. Frontend constructs BTC transaction with this data
     * 3. User signs in MetaMask
     * 4. Frontend submits signed tx to BTC network
     * 5. Frontend calls /api/lifi/track-deposit with txHash
     * 6. Backend polls Li.Fi until complete
     * 7. Backend credits vault
     */

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error in POST /api/lifi/quote-btc-to-usdc:', error);

    if (error instanceof LifiApiError) {
      return NextResponse.json(
        { 
          error: 'Li.Fi API error', 
          message: error.message,
          details: error.response 
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
