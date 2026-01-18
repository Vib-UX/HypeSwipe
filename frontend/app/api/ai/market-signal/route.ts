import { NextResponse } from "next/server";
import type { PositionType, AISignal } from "@/types/trade";
import {
  generateMarketAnalysisPrompts,
  parseAIResponse,
} from "@/lib/ai-prompts";

/**
 * Request body for market signal generation.
 */
export interface MarketSignalRequest {
  marketId: string;
  assets: string[];
  change24h: string;
  openInterest: string;
  netFunding: string;
  volume: string;
  positionType: PositionType;
}

/**
 * Cache entry for AI signals.
 */
interface CacheEntry {
  data: AISignal;
  timestamp: number;
}

/**
 * OpenAI-compatible chat completion request format.
 */
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * OpenAI-compatible chat completion response format.
 */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const signalCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 20 * 60 * 1000;

/**
 * Check if a cache entry is valid (within TTL).
 *
 * @param entry - The cache entry to check
 * @returns true if the entry exists and is within TTL
 */
function isCacheEntryValid(entry: CacheEntry | undefined): entry is CacheEntry {
  if (!entry) {
    return false;
  }
  const now = Date.now();
  return now - entry.timestamp < CACHE_TTL_MS;
}

/**
 * Get cache key for a market ID.
 *
 * @param marketId - The market identifier
 * @returns Cache key string
 */
function getCacheKey(marketId: string): string {
  return `ai-signal-${marketId}`;
}

/**
 * Validates the incoming request body for required fields and correct types.
 * Returns an error message if validation fails, or null if valid.
 */
function validateRequestBody(
  body: unknown,
): { error: string; field?: string } | null {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const data = body as Record<string, unknown>;

  const requiredStringFields = [
    "marketId",
    "change24h",
    "openInterest",
    "netFunding",
    "volume",
  ];

  for (const field of requiredStringFields) {
    if (data[field] === undefined || data[field] === null) {
      return { error: `Missing required field: ${field}`, field };
    }
    if (typeof data[field] !== "string") {
      return { error: `Field '${field}' must be a string`, field };
    }
    if ((data[field] as string).trim() === "") {
      return { error: `Field '${field}' cannot be empty`, field };
    }
  }

  if (!data.assets) {
    return { error: "Missing required field: assets", field: "assets" };
  }
  if (!Array.isArray(data.assets)) {
    return { error: "Field 'assets' must be an array", field: "assets" };
  }
  if (data.assets.length === 0) {
    return {
      error: "Field 'assets' must contain at least one asset",
      field: "assets",
    };
  }
  for (let i = 0; i < data.assets.length; i++) {
    if (typeof data.assets[i] !== "string" || data.assets[i].trim() === "") {
      return {
        error: `Field 'assets[${i}]' must be a non-empty string`,
        field: "assets",
      };
    }
  }

  if (!data.positionType) {
    return {
      error: "Missing required field: positionType",
      field: "positionType",
    };
  }
  if (
    data.positionType !== "relative_pair" &&
    data.positionType !== "one_directional"
  ) {
    return {
      error:
        "Field 'positionType' must be 'relative_pair' or 'one_directional'",
      field: "positionType",
    };
  }

  return null;
}

/**
 * Generate a mock AI response for placeholder use.
 * Used as fallback when Mercury AI environment variables are not configured.
 *
 * @param data - The market signal request data
 * @returns Mock AI response text in JSON format
 */
function generateMockedResponse(data: MarketSignalRequest): string {
  // Parse numeric values for analysis
  const change = parseFloat(data.change24h) || 0;
  const funding = parseFloat(data.netFunding) || 0;

  // Determine sentiment based on metrics
  const bullishPercent = Math.min(
    100,
    Math.max(0, 50 + change * 2 - funding * 10),
  );

  // Determine leverage based on volatility
  let leverage = 5;
  if (Math.abs(change) > 5) {
    leverage = 15;
  } else if (Math.abs(change) > 2) {
    leverage = 10;
  }
  leverage = Math.max(2, Math.min(20, leverage));

  // Determine direction for one-directional positions
  const direction =
    data.positionType === "one_directional"
      ? bullishPercent >= 50
        ? "LONG"
        : "SHORT"
      : undefined;

  const response: Record<string, unknown> = {
    sentiment: `${data.assets.join("/")} showing ${bullishPercent >= 50 ? "bullish" : "bearish"} momentum with ${Math.abs(change).toFixed(1)}% 24h change.`,
    bullishPercent: Math.round(bullishPercent),
    leverage,
    reasoning: `Based on ${Math.abs(change).toFixed(2)}% price movement and ${funding.toFixed(4)}% funding rate. ${Math.abs(change) > 3 ? "High volatility suggests aggressive positioning." : "Moderate conditions favor standard leverage."}`,
  };

  if (direction) {
    response.direction = direction;
  }

  return JSON.stringify(response);
}

/**
 * Mercury AI API base URL (Inception Labs).
 */
const INCEPTION_API_URL = "https://api.inceptionlabs.ai/v1";

/**
 * Check if Mercury AI API key is configured.
 *
 * @returns true if INCEPTION_API_KEY is set
 */
function isInceptionKeySet(): boolean {
  return Boolean(process.env.INCEPTION_API_KEY);
}

/**
 * Call Mercury AI API using OpenAI-compatible format.
 *
 * @param data - The market signal request data
 * @returns AI response text containing JSON
 * @throws Error if API call fails
 */
async function callMercuryAI(data: MarketSignalRequest): Promise<string> {
  const apiKey = process.env.INCEPTION_API_KEY;

  if (!apiKey) {
    throw new Error("INCEPTION_API_KEY environment variable not configured");
  }

  const prompts = generateMarketAnalysisPrompts({
    marketId: data.marketId,
    assets: data.assets,
    change24h: data.change24h,
    openInterest: data.openInterest,
    netFunding: data.netFunding,
    volume: data.volume,
    positionType: data.positionType,
  });

  const requestBody: ChatCompletionRequest = {
    model: "mercury",
    messages: [
      {
        role: "system",
        content: prompts.systemPrompt,
      },
      {
        role: "user",
        content: prompts.userPrompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  const response = await fetch(`${INCEPTION_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Mercury AI API error: ${response.status} - ${errorText}`);
  }

  const responseData = (await response.json()) as ChatCompletionResponse;

  if (!responseData.choices || responseData.choices.length === 0) {
    throw new Error("Mercury AI returned empty response");
  }

  const aiContent = responseData.choices[0].message.content;
  if (!aiContent) {
    throw new Error("Mercury AI returned empty message content");
  }

  return aiContent;
}

/**
 * POST /api/ai/market-signal
 *
 * Accepts market metrics and returns AI-generated trading signals.
 * Implements server-side caching with 20-minute TTL.
 * Parses and validates AI responses to ensure correct format.
 *
 * Uses Mercury (OpenAI-compatible) when INCEPTION_API_KEY and INCEPTION_API_URL
 * environment variables are configured. Falls back to mock response otherwise.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          code: "INVALID_JSON",
        },
        { status: 400 },
      );
    }

    const validationError = validateRequestBody(body);
    if (validationError) {
      return NextResponse.json(
        {
          error: validationError.error,
          code: "VALIDATION_ERROR",
          field: validationError.field,
        },
        { status: 400 },
      );
    }

    const data = body as MarketSignalRequest;
    const cacheKey = getCacheKey(data.marketId);

    const cachedEntry = signalCache.get(cacheKey);
    if (isCacheEntryValid(cachedEntry)) {
      return NextResponse.json({
        signal: cachedEntry.data,
        marketId: data.marketId,
        cached: true,
      });
    }

    let aiResponseText: string;
    let usedMock = false;

    if (isInceptionKeySet()) {
      try {
        aiResponseText = await callMercuryAI(data);
      } catch (mercuryError) {
        const errorMessage =
          mercuryError instanceof Error
            ? mercuryError.message
            : "Unknown Mercury AI error";
        console.error("Mercury AI call failed, falling back to mock:", {
          error: errorMessage,
          marketId: data.marketId,
          timestamp: new Date().toISOString(),
        });
        // Fall back to mock response on Mercury AI error
        aiResponseText = generateMockedResponse(data);
        usedMock = true;
      }
    } else {
      console.warn(
        "Mercury AI not configured. Set INCEPTION_API_KEY environment variable. Using mock response.",
        {
          marketId: data.marketId,
          timestamp: new Date().toISOString(),
        },
      );
      aiResponseText = generateMockedResponse(data);
      usedMock = true;
    }

    let parsedSignal: AISignal;
    try {
      parsedSignal = parseAIResponse(aiResponseText, data.positionType);
    } catch (parseError) {
      const errorMessage =
        parseError instanceof Error
          ? parseError.message
          : "Unknown parsing error";
      console.error("AI response parsing error:", {
        message: errorMessage,
        responseText: aiResponseText.slice(0, 500),
        marketId: data.marketId,
        usedMock,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Failed to parse AI response. Please try again.",
          code: "AI_PARSE_ERROR",
        },
        { status: 500 },
      );
    }

    signalCache.set(cacheKey, {
      data: parsedSignal,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      signal: parsedSignal,
      marketId: data.marketId,
      cached: false,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Market signal error:", {
      message: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Failed to generate market signal. Please try again later.",
        code: "MARKET_SIGNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
