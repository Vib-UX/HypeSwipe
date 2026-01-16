import { NextRequest, NextResponse } from 'next/server';
import { getEquityUsdc, initializeVault } from '@/lib/vault';
import type { VaultResponse } from '@/types';

/**
 * GET /api/vault?address=<evmAddress>
 * 
 * Returns the USDC equity for a given EVM address.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    // Validate address parameter
    if (!address) {
      return NextResponse.json(
        { error: 'Missing required parameter: address' },
        { status: 400 }
      );
    }

    // Basic EVM address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid EVM address format' },
        { status: 400 }
      );
    }

    // Initialize vault if it doesn't exist (returns existing if it does)
    initializeVault(address);

    // Get the equity
    const equityUsdc = getEquityUsdc(address);

    const response: VaultResponse = {
      equityUsdc,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/vault:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
