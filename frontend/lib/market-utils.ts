/**
 * Market Utilities
 *
 * Utility functions for processing Pear Protocol market data,
 * including position type detection and market display formatting.
 */

import type { MarketAsset, PositionType } from "@/types/trade";

/**
 * Minimum weight threshold (as percentage) to consider an asset side as "meaningful".
 * Weights below this threshold are treated as effectively zero.
 */
const MEANINGFUL_WEIGHT_THRESHOLD = 1;

/**
 * Calculate the total weight sum for a list of market assets.
 *
 * @param assets - Array of market assets with weights
 * @returns Sum of all asset weights
 */
function calculateTotalWeight(assets: MarketAsset[]): number {
  if (!assets || assets.length === 0) {
    return 0;
  }

  return assets.reduce((sum, asset) => sum + (asset.weight || 0), 0);
}

/**
 * Check if an asset side has meaningful weight (non-empty and above threshold).
 *
 * @param assets - Array of market assets
 * @returns True if the side has meaningful weight
 */
function hasMeaningfulWeight(assets: MarketAsset[]): boolean {
  const totalWeight = calculateTotalWeight(assets);
  return totalWeight >= MEANINGFUL_WEIGHT_THRESHOLD;
}

/**
 * Detect the position type for a Pear Protocol market.
 *
 * Position types:
 * - `relative_pair`: Both long and short sides have meaningful weights (e.g., 50/50 split)
 * - `one_directional`: One side has 100% weight while the other is empty or zero
 *
 * @param longAssets - Array of long-side market assets with weights
 * @param shortAssets - Array of short-side market assets with weights
 * @returns The detected position type
 *
 * @example
 * // Relative pair (50/50 split)
 * detectPositionType(
 *   [{ asset: "OPENAI", weight: 50 }],
 *   [{ asset: "ANTHROPIC", weight: 50 }]
 * ); // Returns "relative_pair"
 *
 * @example
 * // One-directional (long only)
 * detectPositionType(
 *   [{ asset: "BTC", weight: 100 }],
 *   []
 * ); // Returns "one_directional"
 */
export function detectPositionType(
  longAssets: MarketAsset[] | undefined,
  shortAssets: MarketAsset[] | undefined
): PositionType {
  const longHasMeaningfulWeight = hasMeaningfulWeight(longAssets || []);
  const shortHasMeaningfulWeight = hasMeaningfulWeight(shortAssets || []);

  if (longHasMeaningfulWeight && shortHasMeaningfulWeight) {
    return "relative_pair";
  }

  return "one_directional";
}

/**
 * Generate a display name for a market based on its position type and assets.
 *
 * For relative pairs: "ASSET1 vs ASSET2 (X%-Y%)"
 * For one-directional: "ASSET LONG" or "ASSET SHORT"
 *
 * @param longAssets - Array of long-side market assets
 * @param shortAssets - Array of short-side market assets
 * @param positionType - The detected position type
 * @returns Formatted display name string
 *
 * @example
 * // Relative pair
 * generateDisplayName(
 *   [{ asset: "OPENAI", weight: 50 }],
 *   [{ asset: "ANTHROPIC", weight: 50 }],
 *   "relative_pair"
 * ); // Returns "OPENAI vs ANTHROPIC (50%-50%)"
 *
 * @example
 * // One-directional long
 * generateDisplayName(
 *   [{ asset: "BTC", weight: 100 }],
 *   [],
 *   "one_directional"
 * ); // Returns "BTC LONG"
 */
export function generateDisplayName(
  longAssets: MarketAsset[] | undefined,
  shortAssets: MarketAsset[] | undefined,
  positionType: PositionType
): string {
  const safeLongAssets = longAssets || [];
  const safeShortAssets = shortAssets || [];

  if (positionType === "relative_pair") {
    const longAssetNames = safeLongAssets.map((a) => a.asset).join("+") || "UNKNOWN";
    const shortAssetNames = safeShortAssets.map((a) => a.asset).join("+") || "UNKNOWN";

    return `${longAssetNames} vs ${shortAssetNames}`;
  }

  // One-directional position
  const longHasWeight = hasMeaningfulWeight(safeLongAssets);

  if (longHasWeight && safeLongAssets.length > 0) {
    const assetName = safeLongAssets.map((a) => a.asset).join("+");
    return `${assetName} LONG`;
  }

  if (safeShortAssets.length > 0) {
    const assetName = safeShortAssets.map((a) => a.asset).join("+");
    return `${assetName} SHORT`;
  }

  return "UNKNOWN MARKET";
}
