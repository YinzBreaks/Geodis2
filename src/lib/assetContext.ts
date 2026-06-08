/**
 * assetContext.ts — Maps workflow steps to visible warehouse assets
 *
 * Determines which asset components to render and which is scannable
 * at any given WorkflowStep. The WarehouseFloor reads this to decide
 * what to show.
 *
 * Per CLAUDE.md §Architecture: business logic in /src/lib/, not components.
 */

import { WorkflowStep, type SimulationSession } from "@/types/domain"
import type { AssetContext } from "@/types/warehouse"

/** Empty context — no assets shown, nothing scannable. */
const EMPTY_CONTEXT: AssetContext = {
  showCart: false,
  showTotes: false,
  showShelf: false,
  showItem: false,
  scannableAsset: null,
  highlightedBarcode: null,
}

/**
 * Derive the warehouse floor asset context for a given workflow step.
 *
 * Step → asset mapping per spec:
 *   BC_SCAN_CART_BARCODE        → cart scannable
 *   BC_SCAN_TOTE_BARCODE        → cart + totes, tote scannable
 *   BC_PLACE_TOTE_IN_SLOT       → cart + totes, tote highlighted
 *   BC_* menu steps             → cart visible, nothing scannable
 *   PK_TRAVEL_TO_LOCATION       → shelf + item, nothing scannable
 *   PK_VERIFY_LOCATION          → shelf, location scannable
 *   PK_SCAN_ITEM_UPC            → shelf + item, item scannable
 *   PK_SCAN_TOTE_BARCODE        → cart + totes, tote scannable
 *   PK_* confirm steps          → shelf + item, nothing scannable
 *   EX_* exception steps        → keep previous context (no change)
 */
export function getAssetContext(
  step: WorkflowStep,
  session: SimulationSession
): AssetContext {
  const pick = session.pickQueue[session.currentPickIndex]
  const currentTote = session.cart.totes[session.currentToteSlot - 1]

  switch (step) {
    // ── Build Cart: scan the cart ────────────────────────────────────────
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return {
        showCart: true,
        showTotes: false,
        showShelf: false,
        showItem: false,
        scannableAsset: "cart",
        highlightedBarcode: session.cart.cartBarcode,
      }

    // ── Build Cart: scan a tote barcode ──────────────────────────────────
    case WorkflowStep.BC_SCAN_TOTE_BARCODE:
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: "tote",
        highlightedBarcode: currentTote?.barcode ?? null,
      }

    // ── Build Cart: place tote in slot (confirm step, tote highlighted) ──
    case WorkflowStep.BC_PLACE_TOTE_IN_SLOT:
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: currentTote?.barcode ?? null,
      }

    // ── Build Cart: CTRL+E finalize ──────────────────────────────────────
    case WorkflowStep.BC_PRESS_CTRL_E:
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Build Cart: scan zone / FEX task group barcode ──────────────────
    // Per BBWD-WI-030 §5.1.9: scan the zone barcode (Z1, Z2, HAZ, FEX…)
    // The engine validates against session.cart.taskGroup.
    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      return {
        showCart: false,
        showTotes: false,
        showShelf: false,
        showItem: false,
        scannableAsset: "zone",
        highlightedBarcode: session.cart.taskGroup,
      }

    // ── Build Cart: menu/login steps — cart visible, no scan ─────────────
    case WorkflowStep.BC_LOGIN_RF:
    case WorkflowStep.BC_SELECT_BBWD:
    case WorkflowStep.BC_SELECT_OUTBOUND:
    case WorkflowStep.BC_PRESS_CTRL_T:
    case WorkflowStep.BC_CONFIRM_TASK_GROUP:
    case WorkflowStep.BC_SELECT_MAKE_TOTE_CART:
      return {
        showCart: true,
        showTotes: false,
        showShelf: false,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Pick: navigate to location (no scan, just show shelf) ────────────
    case WorkflowStep.PK_TRAVEL_TO_LOCATION:
      return {
        showCart: false,
        showTotes: false,
        showShelf: true,
        showItem: true,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Pick: verify location — physical confirmation step (CONFIRM, not SCAN)
    // Per BBWD-WI-030 §5.2.7: user visually verifies the location matches
    // the RF Device, then presses Continue. The location is highlighted as a
    // visual reference but IS NOT scannable — the ConfirmActionBar handles this step.
    // (Transitions map PK_VERIFY_LOCATION → CONFIRM; scanning here is rejected.)
    case WorkflowStep.PK_VERIFY_LOCATION:
      return {
        showCart: false,
        showTotes: false,
        showShelf: true,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: pick?.location.displayLabel ?? null,
      }

    // ── Pick: scan item UPC ──────────────────────────────────────────────
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return {
        showCart: false,
        showTotes: false,
        showShelf: true,
        showItem: true,
        scannableAsset: "item",
        highlightedBarcode: pick?.item.upcBarcode ?? null,
      }

    // ── Pick: scan tote barcode after picking ────────────────────────────
    // Per BBWD-WI-030 §5.2.13: scan the tote shown on the RF Device.
    // The correct tote is determined by pick.targetSlot, NOT currentToteSlot.
    // currentToteSlot is a build-cart concept (slots 1–9 during loading) and
    // stays at 9 after cart build; using it here causes S9 to be the only
    // scannable tote on every pick cycle.
    case WorkflowStep.PK_SCAN_TOTE_BARCODE: {
      const targetTote = pick
        ? session.cart.totes.find((t) => t.slot === pick.targetSlot)
        : undefined
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: "tote",
        highlightedBarcode: targetTote?.barcode ?? null,
        activeToteSlot: pick?.targetSlot ?? null,
      }
    }

    // ── Pick: confirm steps (read display, verify item, pick qty, place) ─
    case WorkflowStep.PK_READ_PICK_DISPLAY:
    case WorkflowStep.PK_VERIFY_ITEM:
    case WorkflowStep.PK_PICK_QUANTITY:
    case WorkflowStep.PK_PLACE_IN_TOTE:
    case WorkflowStep.PK_ENTER_QUANTITY:
      return {
        showCart: false,
        showTotes: false,
        showShelf: true,
        showItem: true,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Pick: end of tote / conveyor — show cart + totes ─────────────────
    case WorkflowStep.PK_END_OF_TOTE_DISPLAY:
    case WorkflowStep.PK_PRESS_CTRL_A:
    case WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR:
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Exception steps — keep whatever was showing before ───────────────
    case WorkflowStep.EX_TOTE_ALREADY_ALLOCATED:
    case WorkflowStep.EX_CART_ALREADY_CREATED:
    case WorkflowStep.EX_INCORRECT_LOCATION:
    case WorkflowStep.EX_INCORRECT_TOTE:
    case WorkflowStep.EX_INVALID_ITEM_LAST:
    case WorkflowStep.EX_INVALID_ITEM_NOT_LAST:
    case WorkflowStep.EX_SHORT_INVENTORY:
    case WorkflowStep.EX_DAMAGED_ITEM:
    case WorkflowStep.EX_PRESS_CTRL_W:
    case WorkflowStep.EX_PRESS_CTRL_K:
    case WorkflowStep.EX_NOTIFY_LEAD:
    case WorkflowStep.EX_ITEM_TO_AMNESTY_BIN:
    case WorkflowStep.EX_ITEM_TO_IC:
      // Exceptions show shelf if we were picking, cart if we were building
      if (pick) {
        return {
          showCart: false,
          showTotes: false,
          showShelf: true,
          showItem: true,
          scannableAsset: null,
          highlightedBarcode: null,
        }
      }
      return {
        showCart: true,
        showTotes: true,
        showShelf: false,
        showItem: false,
        scannableAsset: null,
        highlightedBarcode: null,
      }

    // ── Post-round steps ─────────────────────────────────────────────────
    case WorkflowStep.PS_ROUND_COMPLETE:
    case WorkflowStep.PS_CONTINUE_NEXT_TOTE:
    case WorkflowStep.PS_TRASH_PICKUP:
    case WorkflowStep.PS_LAST_ITEM_IN_BOX:
    case WorkflowStep.PS_LAST_ITEM_ON_PALLET:
      return EMPTY_CONTEXT

    default:
      return EMPTY_CONTEXT
  }
}
