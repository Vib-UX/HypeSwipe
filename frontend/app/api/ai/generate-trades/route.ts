import { NextResponse } from "next/server";
import type { PearMarket, AITradeIdea } from "@/types/trade";
import {
  generateBatchMarketPrompts,
  parseBatchAIResponse,
} from "@/lib/ai-prompts";

interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const INCEPTION_API_URL = "https://api.inceptionlabs.ai/v1";

/**
 * Call Mercury AI for batch market analysis.
 */
async function callMercuryBatch(markets: PearMarket[]): Promise<AITradeIdea[]> {
  const apiKey = process.env.INCEPTION_API_KEY;

  if (!apiKey) {
    throw new Error("INCEPTION_API_KEY not configured");
  }

  const prompts = generateBatchMarketPrompts({ markets });

  const requestBody: ChatCompletionRequest = {
    model: "mercury",
    messages: [
      { role: "system", content: prompts.systemPrompt },
      { role: "user", content: prompts.userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
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
    throw new Error(`Mercury API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("Mercury returned empty response");
  }

  return parseBatchAIResponse(data.choices[0].message.content);
}

/**
 * POST /api/ai/generate-trades
 *
 * Accepts a batch of markets and returns AI-generated trade ideas with custom titles.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.markets || !Array.isArray(body.markets)) {
      return NextResponse.json(
        { error: "Request must include 'markets' array" },
        { status: 400 }
      );
    }

    if (body.markets.length === 0) {
      return NextResponse.json({ trades: [] });
    }

    if (!process.env.INCEPTION_API_KEY) {
      return NextResponse.json(
        { error: "INCEPTION_API_KEY not configured" },
        { status: 503 }
      );
    }

    const markets = body.markets as PearMarket[];
    const trades = await callMercuryBatch(markets);

    return NextResponse.json({
      trades,
      count: trades.length,
    });
  } catch (error) {
    console.error("Generate trades error:", error);
    return NextResponse.json(
      { error: "Failed to generate trade ideas" },
      { status: 500 }
    );
  }
}
