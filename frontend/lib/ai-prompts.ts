/**
 * AI Prompt Utilities
 *
 * Functions for generating prompts for Mercury AI market analysis.
 * These prompts are designed for a "degen" trading platform context
 * with aggressive leverage suggestions.
 */

import type { PositionType } from "@/types/trade";

/**
 * Input parameters for generating market analysis prompts.
 */
export interface MarketAnalysisInput {
  marketId: string;
  assets: string[];
  change24h: string;
  openInterest: string;
  netFunding: string;
  volume: string;
  positionType: PositionType;
}

/**
 * Expected JSON structure for AI response.
 * Used for documentation and parsing guidance.
 */
export interface AIResponseFormat {
  sentiment: string;
  bullishPercent: number;
  leverage: number;
  direction?: "LONG" | "SHORT";
  reasoning: string;
}

/**
 * Generated prompt pair for AI analysis.
 */
export interface GeneratedPrompts {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * System prompt establishing the AI's role as a trading analyst
 * for a degen trading platform.
 */
const SYSTEM_PROMPT = `You are an expert crypto trading analyst for HypeSwipe, a degen perpetual trading platform where users make quick trading decisions through a Tinder-style swipe interface.

Your role is to analyze market data and provide aggressive, actionable trading insights. This is a high-risk, high-reward platform - users expect bold calls, not conservative advice.

Guidelines:
- Be direct and confident in your analysis
- Favor higher leverage (10-20x) when volatility indicators are strong
- Favor moderate leverage (5-10x) for normal conditions
- Only suggest low leverage (2-5x) when clear warning signs exist
- Keep sentiment summaries punchy and trader-friendly (1-2 sentences max)
- Focus on momentum, volume, and funding rate signals

Always respond with valid JSON matching the requested format. Do not include any text outside the JSON object.`;

/**
 * Generate the JSON response format specification based on position type.
 *
 * @param positionType - Whether this is a relative pair or one-directional position
 * @returns JSON schema description for the AI response
 */
function getResponseFormatSpec(positionType: PositionType): string {
  const baseFormat = `{
  "sentiment": "string (1-2 sentences, punchy trading insight)",
  "bullishPercent": number (0-100, your confidence in bullish outcome),
  "leverage": number (2-20, suggested leverage multiplier),
  "reasoning": "string (brief explanation of your analysis)"`;

  if (positionType === "one_directional") {
    return `${baseFormat},
  "direction": "LONG" | "SHORT" (your recommended trade direction)
}`;
  }

  return `${baseFormat}
}`;
}

/**
 * Format a numeric string for display in the prompt.
 * Handles percentages, currency values, and raw numbers.
 *
 * @param value - Raw string value from API
 * @param label - What this value represents (for context)
 * @returns Formatted string for prompt inclusion
 */
function formatMetricValue(value: string, label: string): string {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return `${label}: ${value}`;
  }

  if (label.includes("change") || label.includes("funding")) {
    const sign = numValue >= 0 ? "+" : "";
    return `${label}: ${sign}${numValue.toFixed(2)}%`;
  }

  if (label.includes("volume") || label.includes("interest")) {
    if (numValue >= 1_000_000) {
      return `${label}: $${(numValue / 1_000_000).toFixed(2)}M`;
    }
    if (numValue >= 1_000) {
      return `${label}: $${(numValue / 1_000).toFixed(2)}K`;
    }
    return `${label}: $${numValue.toFixed(2)}`;
  }

  return `${label}: ${value}`;
}

/**
 * Generate prompts for AI market analysis.
 *
 * Creates a system prompt establishing the AI as a degen trading analyst
 * and a user prompt containing all market metrics with response format specification.
 *
 * @param input - Market data and metrics to analyze
 * @returns Object containing systemPrompt and userPrompt strings
 *
 * @example
 * const prompts = generateMarketAnalysisPrompts({
 *   marketId: "BTC-PERP",
 *   assets: ["BTC"],
 *   change24h: "5.2",
 *   openInterest: "150000000",
 *   netFunding: "0.01",
 *   volume: "500000000",
 *   positionType: "one_directional"
 * });
 */
export function generateMarketAnalysisPrompts(
  input: MarketAnalysisInput
): GeneratedPrompts {
  const {
    marketId,
    assets,
    change24h,
    openInterest,
    netFunding,
    volume,
    positionType,
  } = input;

  const assetList = assets.join(", ");
  const positionTypeLabel =
    positionType === "relative_pair"
      ? "Relative Pair (long one asset vs short another)"
      : "One-Directional (single asset position)";

  const metricsSection = [
    `Market ID: ${marketId}`,
    `Assets: ${assetList}`,
    `Position Type: ${positionTypeLabel}`,
    formatMetricValue(change24h, "24h Price Change"),
    formatMetricValue(openInterest, "Open Interest"),
    formatMetricValue(netFunding, "Net Funding Rate"),
    formatMetricValue(volume, "24h Volume"),
  ].join("\n");

  const directionInstruction =
    positionType === "one_directional"
      ? `\nSince this is a one-directional position, you MUST also decide the trade direction (LONG or SHORT) based on the market data.`
      : "";

  const userPrompt = `Analyze the following market data and provide a trading signal:

${metricsSection}
${directionInstruction}

Consider these factors in your analysis:
- High 24h change suggests momentum - favor higher leverage
- Elevated funding rates indicate crowded trades - consider contrarian positions
- High volume confirms trend strength
- Open interest changes signal accumulation or distribution

Respond with a JSON object in exactly this format:
${getResponseFormatSpec(positionType)}

Remember: This is a degen platform. Users want aggressive, high-conviction calls. Don't be boring.`;

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  };
}

/**
 * Parse and validate an AI response string into the expected format.
 *
 * @param responseText - Raw text response from AI
 * @param positionType - Position type to validate direction field
 * @returns Parsed and validated AIResponseFormat object
 * @throws Error if parsing fails or validation fails
 */
export function parseAIResponse(
  responseText: string,
  positionType: PositionType
): AIResponseFormat {
  let parsed: unknown;

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${responseText.slice(0, 200)}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response is not a valid object");
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data.sentiment !== "string" || data.sentiment.length === 0) {
    throw new Error("Invalid or missing 'sentiment' field");
  }

  if (typeof data.bullishPercent !== "number") {
    throw new Error("Invalid or missing 'bullishPercent' field");
  }

  if (typeof data.leverage !== "number") {
    throw new Error("Invalid or missing 'leverage' field");
  }

  if (typeof data.reasoning !== "string" || data.reasoning.length === 0) {
    throw new Error("Invalid or missing 'reasoning' field");
  }

  const bullishPercent = Math.max(0, Math.min(100, Math.round(data.bullishPercent)));
  const leverage = Math.max(2, Math.min(20, Math.round(data.leverage)));

  const result: AIResponseFormat = {
    sentiment: data.sentiment.slice(0, 500),
    bullishPercent,
    leverage,
    reasoning: data.reasoning.slice(0, 1000),
  };

  if (positionType === "one_directional") {
    if (data.direction !== "LONG" && data.direction !== "SHORT") {
      throw new Error("Invalid or missing 'direction' field for one-directional position");
    }
    result.direction = data.direction;
  }

  return result;
}
