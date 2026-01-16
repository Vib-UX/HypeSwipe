/**
 * Li.Fi API Integration Module
 *
 * Based on Li.Fi documentation:
 * - https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example
 * - https://docs.li.fi/introduction/lifi-architecture/bitcoin-overview
 *
 * This module provides typed functions for interacting with the Li.Fi API
 * to facilitate BTC → EVM chain swaps.
 */

import { Transaction } from "@scure/btc-signer";
import { hex } from "@scure/base";
import type {
  LifiChain,
  LifiToken,
  LifiTool,
  LifiQuoteResponse,
  LifiStatusResponse,
} from "@/types";

const LIFI_BASE_URL = "https://li.quest/v1";

/**
 * Custom error class for Li.Fi API errors
 */
export class LifiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "LifiApiError";
  }
}

/**
 * Helper function to make API requests to Li.Fi
 */
async function lifiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${LIFI_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        parsedError = errorBody;
      }
      throw new LifiApiError(
        `Li.Fi API error: ${response.status} ${response.statusText}`,
        response.status,
        parsedError
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof LifiApiError) {
      throw error;
    }
    throw new LifiApiError(
      `Failed to fetch from Li.Fi API: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get UTXO chains (Bitcoin)
 * Endpoint: GET /chains?chainTypes=UTXO
 */
export async function getUtxoChains(): Promise<{ chains: LifiChain[] }> {
  return lifiRequest<{ chains: LifiChain[] }>("/chains?chainTypes=UTXO");
}

/**
 * Get all chains
 * Endpoint: GET /chains
 */
export async function getChains(): Promise<{ chains: LifiChain[] }> {
  return lifiRequest<{ chains: LifiChain[] }>("/chains");
}

/**
 * Get tools/bridges available for specific chains
 * Endpoint: GET /tools?chains=<chainId>
 *
 * @param chainId - The chain ID (e.g., 20000000000001 for Bitcoin)
 */
export async function getTools(
  chainId: number | string
): Promise<{ bridges: LifiTool[]; exchanges: LifiTool[] }> {
  return lifiRequest<{ bridges: LifiTool[]; exchanges: LifiTool[] }>(
    `/tools?chains=${chainId}`
  );
}

/**
 * Get tokens available on a chain
 * Endpoint: GET /tokens?chains=<chainKey>
 *
 * @param chainKey - The chain key (e.g., 'BTC' for Bitcoin)
 */
export async function getTokens(
  chainKey: string
): Promise<{ tokens: Record<string, LifiToken[]> }> {
  return lifiRequest<{ tokens: Record<string, LifiToken[]> }>(
    `/tokens?chains=${chainKey}`
  );
}

/**
 * Get specific token details
 * Endpoint: GET /token?chain=<chainId>&token=<tokenAddress>
 */
export async function getTokenDetails(
  chainId: number | string,
  tokenAddress: string
): Promise<LifiToken> {
  return lifiRequest<LifiToken>(
    `/token?chain=${chainId}&token=${tokenAddress}`
  );
}

/**
 * Parameters for getting a BTC to EVM quote
 */
export interface GetBtcToEvmQuoteParams {
  fromAddress: string; // BTC address (supports single address, multiple semicolon-separated, xpub, or combinations)
  fromAmount: string; // Amount in satoshis
  toChainId: number; // Destination EVM chain ID (e.g., 1 for Ethereum, 42161 for Arbitrum)
  toAddress: string; // EVM address to receive the tokens
  toToken: string; // Token address on destination chain (use 0x0...0 for native ETH)
  slippage?: number; // Slippage tolerance as decimal (e.g., 0.01 = 1%). Default: 0.01 (1%) for BTC bridges
  allowBridges?: string[]; // Optional: limit to specific bridges (e.g., ['relay', 'chainflip', 'thorswap'])
}

/**
 * Get a quote for BTC → EVM swap
 * Endpoint: GET /quote
 *
 * Based on Li.Fi Bitcoin tx example:
 * https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example
 *
 * Note: BTC bridges typically require higher slippage (1%+) due to price volatility
 * during the longer confirmation times.
 *
 * @param params - Quote parameters
 * @returns Quote response including transactionRequest with BTC vault address and memo
 */
export async function getBtcToEvmQuote(
  params: GetBtcToEvmQuoteParams
): Promise<LifiQuoteResponse> {
  // Default to 1% slippage for BTC bridges (they recommend higher due to longer confirmation times)
  const slippage = params.slippage ?? 0.01;

  const queryParams = new URLSearchParams({
    fromChain: "BTC",
    fromToken: "bitcoin",
    fromAddress: params.fromAddress,
    fromAmount: params.fromAmount,
    toChain: params.toChainId.toString(),
    toToken: params.toToken,
    toAddress: params.toAddress,
    slippage: slippage.toString(),
  });

  // Add bridge filter if specified
  if (params.allowBridges && params.allowBridges.length > 0) {
    queryParams.append("allowBridges", params.allowBridges.join(","));
  }

  return lifiRequest<LifiQuoteResponse>(`/quote?${queryParams.toString()}`);
}

/**
 * Get the status of a cross-chain transaction
 * Endpoint: GET /status
 *
 * @param txHash - The transaction hash
 * @param fromChain - Source chain ID
 * @param toChain - Destination chain ID
 * @param bridge - Bridge tool used (optional)
 */
export async function getTransactionStatus(
  txHash: string,
  fromChain: number | string,
  toChain: number | string,
  bridge?: string
): Promise<LifiStatusResponse> {
  const queryParams = new URLSearchParams({
    txHash,
    fromChain: fromChain.toString(),
    toChain: toChain.toString(),
  });

  if (bridge) {
    queryParams.append("bridge", bridge);
  }

  return lifiRequest<LifiStatusResponse>(`/status?${queryParams.toString()}`);
}

/**
 * Parsed PSBT transaction data
 */
export interface ParsedPsbtData {
  /** The deposit address (1st output) */
  depositAddress: string | null;
  /** The deposit amount in satoshis */
  depositAmount: number;
  /** The OP_RETURN memo (2nd output) - contains bridge routing info */
  memo: string | null;
  /** The refund address (3rd output, if present) */
  refundAddress: string | null;
  /** The refund amount in satoshis (3rd output) */
  refundAmount: number;
  /** All outputs with their details */
  outputs: Array<{
    index: number;
    address: string | null;
    amount: number;
    isOpReturn: boolean;
    script: string;
  }>;
  /** Raw transaction hex */
  rawTxHex: string;
}

/**
 * Check if a script is an OP_RETURN output
 * OP_RETURN opcode is 0x6a
 */
function isOpReturnScript(script: Uint8Array): boolean {
  return script.length > 0 && script[0] === 0x6a;
}

/**
 * Extract memo text from OP_RETURN script
 * OP_RETURN format: 0x6a <push_opcode> <data>
 */
function extractOpReturnMemo(script: Uint8Array): string | null {
  if (!isOpReturnScript(script)) return null;

  try {
    // Skip the OP_RETURN opcode (0x6a)
    // The next byte(s) indicate the data length
    let offset = 1;

    if (offset >= script.length) return null;

    const pushOpcode = script[offset];
    offset++;

    let dataLength: number;

    // Handle different push opcodes
    if (pushOpcode <= 0x4b) {
      // Direct push: opcode is the length
      dataLength = pushOpcode;
    } else if (pushOpcode === 0x4c) {
      // OP_PUSHDATA1: next byte is length
      if (offset >= script.length) return null;
      dataLength = script[offset];
      offset++;
    } else if (pushOpcode === 0x4d) {
      // OP_PUSHDATA2: next 2 bytes are length (little-endian)
      if (offset + 1 >= script.length) return null;
      dataLength = script[offset] | (script[offset + 1] << 8);
      offset += 2;
    } else if (pushOpcode === 0x4e) {
      // OP_PUSHDATA4: next 4 bytes are length (little-endian)
      if (offset + 3 >= script.length) return null;
      dataLength =
        script[offset] |
        (script[offset + 1] << 8) |
        (script[offset + 2] << 16) |
        (script[offset + 3] << 24);
      offset += 4;
    } else {
      // Unknown format, try to decode the rest as text
      const data = script.slice(1);
      return new TextDecoder().decode(data);
    }

    // Extract the data
    if (offset + dataLength > script.length) {
      // Not enough data, decode what we have
      const data = script.slice(offset);
      return new TextDecoder().decode(data);
    }

    const data = script.slice(offset, offset + dataLength);
    return new TextDecoder().decode(data);
  } catch {
    // If decoding fails, return hex representation
    return hex.encode(script.slice(1));
  }
}

/**
 * Decode a PSBT hex string and extract transaction details
 *
 * Based on Li.Fi documentation:
 * - 1st output: Bridged amount sent to the bridge depositor address
 * - 2nd output: OP_RETURN containing the memo with bridge-specific and LI.FI tracking details
 * - 3rd output: Refund output back to sender's address (optional for some bridges)
 * - Remaining outputs: Integrator-specific fee transfers
 *
 * @param psbtHex - The PSBT in hex format from transactionRequest.data
 * @returns Parsed transaction data including memo, addresses, and amounts
 */
export function decodePsbt(psbtHex: string): ParsedPsbtData {
  try {
    // Decode the PSBT hex
    const psbtBytes = hex.decode(psbtHex);

    // Parse as a transaction (Li.Fi returns unsigned tx in PSBT format)
    // Note: @scure/btc-signer's Transaction can parse both raw tx and PSBT
    const tx = Transaction.fromPSBT(psbtBytes);

    const outputs: ParsedPsbtData["outputs"] = [];
    let depositAddress: string | null = null;
    let depositAmount = 0;
    let memo: string | null = null;
    let refundAddress: string | null = null;
    let refundAmount = 0;

    // Process each output
    for (let i = 0; i < tx.outputsLength; i++) {
      const output = tx.getOutput(i);
      const script = output.script ? output.script : new Uint8Array();
      const scriptHex = hex.encode(script);
      const isOpReturn = isOpReturnScript(script);

      // Try to get address (returns undefined for OP_RETURN)
      let address: string | null = null;
      if (!isOpReturn && output.script) {
        try {
          // For address extraction, we'd need to parse the script
          // For now, we'll leave it as null and let the caller use tx.to
          address = null;
        } catch {
          address = null;
        }
      }

      const amount = Number(output.amount || 0);

      outputs.push({
        index: i,
        address,
        amount,
        isOpReturn,
        script: scriptHex,
      });

      // Assign based on position per Li.Fi spec
      if (i === 0) {
        depositAddress = address;
        depositAmount = amount;
      } else if (i === 1 && isOpReturn) {
        memo = extractOpReturnMemo(script);
      } else if (i === 2) {
        refundAddress = address;
        refundAmount = amount;
      }
    }

    return {
      depositAddress,
      depositAmount,
      memo,
      refundAddress,
      refundAmount,
      outputs,
      rawTxHex: hex.encode(tx.toBytes()),
    };
  } catch (error) {
    console.error("Failed to decode PSBT:", error);
    // Return empty result on error
    return {
      depositAddress: null,
      depositAmount: 0,
      memo: null,
      refundAddress: null,
      refundAmount: 0,
      outputs: [],
      rawTxHex: "",
    };
  }
}

/**
 * Parse the memo from a Li.Fi transactionRequest data field
 *
 * For BTC transactions, the data field contains either:
 * - A PSBT (Partially Signed Bitcoin Transaction) in hex format
 * - A memo string directly
 *
 * The memo is used for routing through bridges like ThorSwap, Chainflip, etc.
 *
 * Example memos by bridge:
 * - ThorSwap: =:ETH.USDC:0x29DaCdF7cCaDf4eE67c923b4C22255A4B2494eD7::lifi:0|0x4977d81c2a5d6bd8
 * - Unit: =|lifi02bf57fe
 * - Symbiosis: =|lifi02bf57fe
 * - Relay: 0x986c2efd25b8887e9c187cfe2162753567339b6313e7137b749e83d4a1a79b03=|lifi92c9cbbc5
 * - Chainflip: 0x01071eb6638de8c571c787d7bc24f98bfa735425731c6400f4c5ef05...=|lifi92c9cbbc5
 */
export function parseTransactionMemo(data: string): string {
  // If the data is a simple memo string (not PSBT hex), return as-is
  if (data.startsWith("=:") || data.startsWith("=|")) {
    return data;
  }

  // Check if it looks like PSBT hex (starts with "70736274" which is "psbt" in ASCII)
  // or raw transaction hex
  if (/^[0-9a-fA-F]+$/.test(data)) {
    try {
      const parsed = decodePsbt(data);
      if (parsed.memo) {
        return parsed.memo;
      }
    } catch {
      // Fall through to return original data
    }
  }

  return data;
}

/**
 * Format satoshis to BTC string
 */
export function satsToBtc(sats: string | number): string {
  const satsNum = typeof sats === "string" ? parseInt(sats, 10) : sats;
  return (satsNum / 100_000_000).toFixed(8);
}

/**
 * Format BTC to satoshis string
 */
export function btcToSats(btc: string | number): string {
  const btcNum = typeof btc === "string" ? parseFloat(btc) : btc;
  return Math.floor(btcNum * 100_000_000).toString();
}
