import { NextResponse } from "next/server";

const PEAR_API_BASE_URL = "https://hl-v2.pearprotocol.io";

interface CreatePositionRequest {
  longAssets: Array<{ asset: string; weight: number }>;
  shortAssets: Array<{ asset: string; weight: number }>;
  usdValue: number;
  leverage: number;
  direction: "LONG" | "SHORT";
  positionType: "relative_pair" | "one_directional";
}

/**
 * POST /api/positions/create
 *
 * Creates a position on Pear Protocol.
 * Supports both one-directional and relative pair positions.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    const body: CreatePositionRequest = await request.json();
    const { longAssets, shortAssets, usdValue, leverage, direction, positionType } = body;

    if (!usdValue || usdValue < 1) {
      return NextResponse.json(
        { error: "Position size must be at least $1" },
        { status: 400 }
      );
    }

    if (!leverage || leverage < 1 || leverage > 100) {
      return NextResponse.json(
        { error: "Leverage must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Build position payload based on type
    let positionPayload: {
      longAssets?: Array<{ asset: string; weight: number }>;
      shortAssets?: Array<{ asset: string; weight: number }>;
      usdValue: number;
      leverage: number;
      slippage: number;
      executionType: string;
    };

    // Convert weights from percentage (0-100) to decimal (0-1)
    const toDecimalWeight = (w: number) => w > 1 ? w / 100 : w;

    // Normalize weights - ensure they sum to 1 on each side, uppercase asset names
    const normalizeWeights = (assets: Array<{ asset: string; weight: number }>) => {
      if (assets.length === 0) return [];
      const totalWeight = assets.reduce((sum, a) => sum + (a.weight > 1 ? a.weight / 100 : a.weight), 0);
      return assets.map(a => ({
        asset: a.asset.toUpperCase(),
        weight: totalWeight > 0 ? (a.weight > 1 ? a.weight / 100 : a.weight) / totalWeight : 1 / assets.length
      }));
    };

    if (positionType === "relative_pair") {
      // Relative pair: both long and short assets
      positionPayload = {
        longAssets: normalizeWeights(longAssets),
        shortAssets: normalizeWeights(shortAssets),
        usdValue,
        leverage,
        slippage: 0.1, // 5% slippage for better fill
        executionType: "MARKET",
      };
    } else {
      // One-directional: only one side based on direction
      const primaryAsset = (longAssets[0]?.asset || shortAssets[0]?.asset || "").toUpperCase();

      if (direction === "LONG") {
        positionPayload = {
          longAssets: primaryAsset ? [{ asset: primaryAsset, weight: 1 }] : [],
          shortAssets: [],
          usdValue,
          leverage,
          slippage: 0.1,
          executionType: "MARKET",
        };
      } else {
        positionPayload = {
          longAssets: [],
          shortAssets: primaryAsset ? [{ asset: primaryAsset, weight: 1 }] : [],
          usdValue,
          leverage,
          slippage: 0.1,
          executionType: "MARKET",
        };
      }
    }

    // Validate we have at least one asset
    if ((!positionPayload.longAssets || positionPayload.longAssets.length === 0) &&
        (!positionPayload.shortAssets || positionPayload.shortAssets.length === 0)) {
      return NextResponse.json(
        { error: "Position must have at least one asset" },
        { status: 400 }
      );
    }

    // Auto-adjust notional to meet minimum per asset (~$11 on Hyperliquid)
    const MIN_NOTIONAL_PER_ASSET = 11;
    const totalAssets = (positionPayload.longAssets?.length || 0) + (positionPayload.shortAssets?.length || 0);
    const minRequiredNotional = MIN_NOTIONAL_PER_ASSET * totalAssets;

    // Bump up usdValue if needed to ensure all legs execute
    const adjustedUsdValue = Math.max(usdValue, minRequiredNotional);

    // Update the payload with adjusted value
    positionPayload.usdValue = adjustedUsdValue;

    // Check account balance before trading
    const balanceResponse = await fetch(`${PEAR_API_BASE_URL}/vault-wallet/balances`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "Authorization": authHeader },
    });
    const balanceData = await balanceResponse.json();

    // Check if user has sufficient balance for margin + fees
    const rawUSDC = balanceData?.perpBalances?.USDC;
    const perpUSDC = parseFloat(rawUSDC || "0");
    const requiredMargin = positionPayload.usdValue / leverage;
    const estimatedFees = positionPayload.usdValue * 0.005;
    const totalRequired = requiredMargin + estimatedFees;
    if (perpUSDC < totalRequired) {
      return NextResponse.json(
        { error: `Insufficient balance. Need ~$${totalRequired.toFixed(2)} (margin + fees), have $${perpUSDC.toFixed(2)} USDC` },
        { status: 400 }
      );
    }


    // Build clean payload - assets first, then trading params
    const cleanedPayload: Record<string, unknown> = {};

    // Add assets first (if present)
    if (positionPayload.longAssets && positionPayload.longAssets.length > 0) {
      cleanedPayload.longAssets = positionPayload.longAssets;
    }
    if (positionPayload.shortAssets && positionPayload.shortAssets.length > 0) {
      cleanedPayload.shortAssets = positionPayload.shortAssets;
    }

    // Trading parameters - matching Pear UI format exactly
    cleanedPayload.executionType = "MARKET";
    cleanedPayload.leverage = Math.round(positionPayload.leverage);
    cleanedPayload.usdValue = Math.round(positionPayload.usdValue * 100) / 100;
    cleanedPayload.slippage = 0.05; // 5% slippage for reliable fills
    cleanedPayload.takeProfit = null;
    cleanedPayload.stopLoss = null;
    // cleanedPayload.referralCode = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const response = await fetch(`${PEAR_API_BASE_URL}/positions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(cleanedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
      let errorMessage = "Failed to create position";
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(", ");
      } else if (typeof errorData.message === "string") {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      fills: result.fills,
    });
  } catch (error) {
    console.error("Create position error:", error);
    return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
  }
}
