/**
 * warehouse.ts — Types for the visual scanning system
 *
 * Defines asset context, scan animation state, and scannable asset types
 * for the warehouse floor visual panel.
 *
 * Per CLAUDE.md §Architecture: all types in /src/types/
 */
import type { ToteSlot } from "@/types/domain"
// ─────────────────────────────────────────────────────────────────────────────
// SCANNABLE ASSET TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** The kind of physical warehouse asset that can be scanned. */
export type ScannableAssetType = "cart" | "tote" | "location" | "item" | "zone"

/**
 * Describes which warehouse assets to render and which is scannable
 * at the current workflow step.
 *
 * Produced by getAssetContext() in src/lib/assetContext.ts.
 */
export interface AssetContext {
  /** Show the pick cart SVG */
  showCart: boolean
  /** Show tote slots on the cart */
  showTotes: boolean
  /** Show the shelf/location SVG */
  showShelf: boolean
  /** Show the item label on the shelf */
  showItem: boolean
  /** Which asset type the trainee should scan, or null if no scan needed */
  scannableAsset: ScannableAssetType | null
  /** The barcode value to highlight, or null */
  highlightedBarcode: string | null
  /**
   * Active tote slot for tote-focused steps.
   * - BC_SCAN_TOTE_BARCODE / BC_PLACE_TOTE_IN_SLOT: session.currentToteSlot
   * - PK_SCAN_TOTE_BARCODE: current pick targetSlot
   * Absent (undefined) for all other steps.
   */
  activeToteSlot?: ToteSlot | null
}

/**
 * Tracks the 250ms scan beam animation state.
 * Used by asset components to show the amber sweep line.
 */
export interface ScanAnimationState {
  /** True during the 250ms scan delay */
  isScanning: boolean
  /** Which asset type is being scanned */
  assetType: ScannableAssetType | null
  /** The barcode value being scanned */
  barcode: string | null
}
