import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/lightning/create-invoice
 * 
 * Creates a Lightning invoice for deposit.
 * 
 * In production, this would:
 * 1. Generate a Lightning invoice using LND/CLN/LNbits
 * 2. Store the payment_hash with the user's EVM address
 * 3. Return the invoice for the user to pay
 * 
 * Body: {
 *   amount: number;        // Amount in satoshis
 *   evm_address: string;   // User's EVM address for crediting
 *   memo?: string;         // Optional invoice memo
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { amount, evm_address, memo } = body;
    
    // Validate required fields
    if (!amount || typeof amount !== 'number' || amount < 10) {
      return NextResponse.json(
        { error: 'Amount must be at least 10 sats' },
        { status: 400 }
      );
    }
    
    if (!evm_address || !/^0x[a-fA-F0-9]{40}$/.test(evm_address)) {
      return NextResponse.json(
        { error: 'Invalid EVM address' },
        { status: 400 }
      );
    }
    
    // Generate a mock payment hash (in production, this comes from the LN node)
    const paymentHash = generatePaymentHash();
    
    // Generate a mock invoice (in production, use LND/CLN/LNbits API)
    // Format: lnbc<amount><random>
    const invoice = generateMockInvoice(amount, paymentHash, memo);
    
    // In production: Store mapping of payment_hash -> evm_address in database
    console.log(`[Lightning] Created invoice for ${amount} sats -> ${evm_address}`);
    console.log(`[Lightning] Payment hash: ${paymentHash}`);
    
    // Calculate expiry (1 hour from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    
    return NextResponse.json({
      invoice,
      payment_hash: paymentHash,
      amount,
      expires_at: expiresAt,
      hyperevm_address: evm_address,
    });
    
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

/**
 * Generate a random payment hash (32 bytes hex)
 */
function generatePaymentHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a mock Lightning invoice
 * In production, this would come from your Lightning node
 */
function generateMockInvoice(amount: number, paymentHash: string, memo?: string): string {
  // This is a simplified mock - real invoices are much more complex
  // Format: lnbc + amount + random chars
  const amountStr = amount.toString();
  const randomPart = paymentHash.slice(0, 40);
  const memoEncoded = memo ? Buffer.from(memo).toString('base64').slice(0, 20) : '';
  
  // Mock invoice format (NOT a real BOLT11 invoice)
  return `lnbc${amountStr}n1p${randomPart}${memoEncoded}`;
}
