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
  LifiAction,
  LifiEstimate,
  LifiTransactionRequest,
} from "@/types";

const LIFI_BASE_URL = "https://li.quest/v1";

// Li.Fi API key for authenticated requests (avoids rate limiting)
// Set via LIFI_API_KEY environment variable
const LIFI_API_KEY = process.env.LIFI_API_KEY || "";

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
 * Uses API key authentication if LIFI_API_KEY env var is set
 */
async function lifiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${LIFI_BASE_URL}${endpoint}`;

  // Build headers with optional API key
  const headers: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
  };

  // Add API key header if available (for authenticated requests)
  if (LIFI_API_KEY) {
    headers["x-lifi-api-key"] = LIFI_API_KEY;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
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
 * Advanced routes response structure
 */
export interface LifiAdvancedRoutesResponse {
  routes: LifiRoute[];
}

export interface LifiRoute {
  id: string;
  fromChainId: number;
  fromAmount: string;
  fromAmountUSD: string;
  fromToken: LifiToken;
  fromAddress: string;
  toChainId: number;
  toAmount: string;
  toAmountMin: string;
  toAmountUSD: string;
  toToken: LifiToken;
  toAddress: string;
  steps: LifiRouteStep[];
  tags: string[];
}

export interface LifiRouteStep {
  id: string;
  type: string;
  tool: string;
  toolDetails: {
    key: string;
    name: string;
    logoURI?: string;
  };
  action: LifiAction;
  estimate: LifiEstimate;
  includedSteps?: LifiRouteStep[];
  transactionRequest?: LifiTransactionRequest;
}

/**
 * Get advanced routes for BTC → Hyperliquid or other multi-step swaps
 * Endpoint: POST /advanced/routes
 *
 * This is required for Hyperliquid (chain 1337) since it uses a 2-step process:
 * 1. BTC → Hyperliquid via relaydepository
 * 2. Internal swap via hyperliquidProtocol
 *
 * @param params - Quote parameters (same as regular quote)
 * @returns Routes with multiple steps
 */
export async function getAdvancedRoutes(
  params: GetBtcToEvmQuoteParams
): Promise<LifiAdvancedRoutesResponse> {
  const slippage = params.slippage ?? 0.01;

  const body = {
    fromChainId: 20000000000001, // BTC chain ID
    fromTokenAddress: "bitcoin",
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toChainId: params.toChainId,
    toTokenAddress: params.toToken,
    toAddress: params.toAddress,
    options: {
      slippage,
      allowSwitchChain: true,
      ...(params.allowBridges && params.allowBridges.length > 0
        ? { bridges: { allow: params.allowBridges } }
        : {}),
    },
  };

  return lifiRequest<LifiAdvancedRoutesResponse>("/advanced/routes", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Get step transaction for executing a route step
 * Endpoint: POST /advanced/stepTransaction
 *
 * Note: The step object is sent directly as the body (not wrapped in { step })
 *
 * @param step - The route step to get transaction for
 * @returns Updated step with transactionRequest
 */
export async function getStepTransaction(
  step: LifiRouteStep
): Promise<LifiRouteStep> {
  return lifiRequest<LifiRouteStep>("/advanced/stepTransaction", {
    method: "POST",
    body: JSON.stringify(step),
  });
}

// Hyperliquid chain ID constant
const HYPERLIQUID_CHAIN_ID = 1337;

/**
 * Smart quote function that uses the appropriate endpoint:
 * - Regular /quote for Ethereum, Arbitrum
 * - /advanced/routes for Hyperliquid (multi-step required)
 *
 * @param params - Quote parameters
 * @returns Quote response (normalized from either endpoint)
 */
export async function getBtcToEvmQuoteSmart(
  params: GetBtcToEvmQuoteParams
): Promise<LifiQuoteResponse> {
  // For Hyperliquid, use advanced routes (multi-step required)
  if (params.toChainId === HYPERLIQUID_CHAIN_ID) {
    const routesResponse = await getAdvancedRoutes(params);

    if (!routesResponse.routes || routesResponse.routes.length === 0) {
      throw new LifiApiError("No available routes for BTC to Hyperliquid", 404);
    }

    const route = routesResponse.routes[0];
    const firstStep = route.steps[0];

    // Get the transaction request for the first step (BTC transaction)
    let stepWithTx = firstStep;
    if (!firstStep.transactionRequest) {
      stepWithTx = await getStepTransaction(firstStep);
    }

    if (!stepWithTx.transactionRequest) {
      throw new LifiApiError(
        "Failed to get transaction request for route",
        500
      );
    }

    // Normalize to LifiQuoteResponse format
    // Calculate total execution duration from all steps
    const totalDuration = route.steps.reduce(
      (sum, s) => sum + (s.estimate?.executionDuration || 0),
      0
    );

    return {
      id: route.id,
      type: "lifi",
      tool: firstStep.tool,
      toolDetails: firstStep.toolDetails,
      action: {
        ...firstStep.action,
        // Override with final destination token
        toToken: route.toToken,
        toChainId: route.toChainId,
      },
      estimate: {
        ...firstStep.estimate,
        // Use final output amounts
        toAmount: route.toAmount,
        toAmountMin: route.toAmountMin,
        toAmountUSD: route.toAmountUSD,
        executionDuration: totalDuration,
      },
      includedSteps: route.steps.map((s) => ({
        id: s.id,
        type: s.type,
        tool: s.tool,
        toolDetails: s.toolDetails,
        action: s.action,
        estimate: s.estimate,
      })),
      transactionRequest: stepWithTx.transactionRequest,
    };
  }

  // For other chains, use regular quote endpoint
  return getBtcToEvmQuote(params);
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
 * Check if a byte array is valid UTF-8 text (printable ASCII + common chars)
 */
function isLikelyUtf8Text(data: Uint8Array): boolean {
  // Check if most bytes are printable ASCII or valid UTF-8
  let printableCount = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    // Printable ASCII (space to ~) or common control chars (tab, newline)
    if (
      (byte >= 0x20 && byte <= 0x7e) ||
      byte === 0x09 ||
      byte === 0x0a ||
      byte === 0x0d
    ) {
      printableCount++;
    }
  }
  // If more than 70% is printable, treat as text
  return data.length > 0 && printableCount / data.length > 0.7;
}

/**
 * Extract memo from OP_RETURN script
 * OP_RETURN format: 0x6a <push_opcode> <data>
 *
 * Returns an object with both hex and text representations:
 * - hex: Always available, the raw hex of the memo data
 * - text: Only if the data appears to be valid text (e.g., ThorSwap memos)
 * - lifiTrackingId: Extracted Li.Fi tracking ID if present (e.g., "lifi2Q..." or "lifi92c9cbbc5")
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
      // Unknown format, return hex of everything after OP_RETURN
      return `0x${hex.encode(script.slice(1))}`;
    }

    // Extract the data
    let data: Uint8Array;
    if (offset + dataLength > script.length) {
      data = script.slice(offset);
    } else {
      data = script.slice(offset, offset + dataLength);
    }

    // Check if it's text-like (ThorSwap, etc.) or binary (Chainflip, etc.)
    if (isLikelyUtf8Text(data)) {
      // It's readable text - return as string
      return new TextDecoder().decode(data);
    } else {
      // Binary data - return as hex with 0x prefix
      // Also try to extract the lifi tracking ID which is usually at the end
      const hexStr = hex.encode(data);

      // Try to find readable lifi suffix in the raw bytes
      // Look for "|lifi" or "=|lifi" pattern
      const textAttempt = new TextDecoder("utf-8", { fatal: false }).decode(
        data
      );
      const lifiMatch = textAttempt.match(/[=|]?lifi[a-zA-Z0-9]+/);

      if (lifiMatch) {
        return `0x${hexStr} (tracking: ${lifiMatch[0]})`;
      }

      return `0x${hexStr}`;
    }
  } catch {
    // If decoding fails, return hex representation
    return `0x${hex.encode(script.slice(1))}`;
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
