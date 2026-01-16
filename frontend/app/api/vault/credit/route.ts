import { NextRequest, NextResponse } from 'next/server';
import { creditVault } from '@/lib/vault';
import type { VaultCreditRequest, VaultResponse } from '@/types';

/**
 * POST /api/vault/credit
 * 
 * Credits USDC to a user's vault balance.
 * 
 * Body: { address: string; amountUsdc: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VaultCreditRequest;

    // Validate required fields
    if (!body.address || body.amountUsdc === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: address, amountUsdc' },
        { status: 400 }
      );
    }

    // Basic EVM address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json(
        { error: 'Invalid EVM address format' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof body.amountUsdc !== 'number' || body.amountUsdc < 0) {
      return NextResponse.json(
        { error: 'amountUsdc must be a non-negative number' },
        { status: 400 }
      );
    }

    // Credit the vault
    const updated = creditVault(body.address, body.amountUsdc);

    const response: VaultResponse = {
      equityUsdc: updated.equityUsdc,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in POST /api/vault/credit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
