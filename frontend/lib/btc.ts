/**
 * Bitcoin utilities including balance checking via BlockCypher API
 */

export interface BtcAddressInfo {
  address: string;
  balance: number; // in satoshis
  unconfirmedBalance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
}

/**
 * Fetch BTC address balance from BlockCypher API
 * Free tier: 200 requests/hour
 * 
 * @param address - Bitcoin address (supports all formats: legacy, segwit, taproot)
 * @returns Address info including balance in satoshis
 */
export async function getBtcAddressInfo(address: string): Promise<BtcAddressInfo> {
  const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Balance check rate limited. Please try again in a moment.');
      }
      throw new Error(`Failed to fetch balance: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      address: data.address,
      balance: data.final_balance || 0,
      unconfirmedBalance: data.unconfirmed_balance || 0,
      totalReceived: data.total_received || 0,
      totalSent: data.total_sent || 0,
      txCount: data.final_n_tx || 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to check BTC balance');
  }
}

/**
 * Format satoshis to BTC string
 */
export function formatBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

/**
 * Format satoshis to display string with unit
 */
export function formatBtcDisplay(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(4)} BTC`;
  } else if (sats >= 1_000_000) {
    return `${(sats / 1_000_000).toFixed(2)}M sats`;
  } else if (sats >= 1_000) {
    return `${(sats / 1_000).toFixed(1)}K sats`;
  }
  return `${sats} sats`;
}

/**
 * Check if address has sufficient balance for a transaction
 * 
 * @param address - BTC address
 * @param requiredSats - Required amount in satoshis
 * @param includeUnconfirmed - Whether to include unconfirmed balance
 * @returns Object with balance info and whether it's sufficient
 */
export async function checkSufficientBalance(
  address: string,
  requiredSats: number,
  includeUnconfirmed = false
): Promise<{
  sufficient: boolean;
  balance: number;
  required: number;
  shortfall: number;
}> {
  const info = await getBtcAddressInfo(address);
  const availableBalance = includeUnconfirmed 
    ? info.balance + info.unconfirmedBalance 
    : info.balance;
  
  // Add ~1000 sats for tx fees estimate
  const totalRequired = requiredSats + 1000;
  
  return {
    sufficient: availableBalance >= totalRequired,
    balance: availableBalance,
    required: totalRequired,
    shortfall: Math.max(0, totalRequired - availableBalance),
  };
}
