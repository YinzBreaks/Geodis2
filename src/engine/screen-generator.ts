/**
 * screen-generator.ts — RF Device screen generation
 *
 * Generates the correct RFDeviceScreen for every WorkflowStep.
 * The engine drives all display — the UI only renders what this function returns.
 *
 * Per SIMULATION.md §RF Device Screen Generator
 * Per BBWD-WI-030 §5.1 (Build Cart) and §5.2 (Pick)
 */

import {
  WorkflowStep,
  type SimulationSession,
  type RFDeviceScreen,
} from "@/types/domain"

/** Per BBWD-WI-030 §5.1: always 9 totes */
const MAX_TOTES_PER_CART = 9

/**
 * Units of measure that do NOT pluralise by appending "s".
 * "1 EACH" / "3 EACH" — not "EACHs". Sourced from GEODIS item catalog conventions.
 */
const NON_PLURALIZING_UNITS = new Set([
  "EACH", "EA", "UNIT", "ROLL", "SHEET", "CASE", "PACK", "BOX", "PALLET",
])

/**
 * Format a unit-of-measure string for display on the RF Device Qty line.
 * Pluralises normally (e.g. "Pair" → "Pairs") but suppresses the trailing "s"
 * for units that are grammatically invariant (e.g. "EACH" stays "EACH").
 * Per BBWD-WI-030 §5.2 RF Device display conventions.
 */
/**
 * Format a Zone as the RF Device's Task Group code.
 *
 * The real "Update Task Group" screen (BBWD-VJA-030) renders numbered zones
 * zero-padded — Z1 displays as "Z01" — while HAZ and FEX display verbatim.
 */
function formatTaskGroup(zone: string): string {
  const numbered = /^Z(\d)$/.exec(zone)
  return numbered ? `Z0${numbered[1]}` : zone
}

function formatPickUnit(qty: number, unit: string): string {
  if (NON_PLURALIZING_UNITS.has(unit.toUpperCase())) return unit
  return qty === 1 ? unit : unit + "s"
}

/**
 * Generate the RFDeviceScreen for the current session state.
 *
 * @param session — current immutable session snapshot
 * @returns The screen the RF Device should display right now
 */
export function generateScreen(session: SimulationSession): RFDeviceScreen {
  const step = session.currentStep
  const pick = session.pickQueue[session.currentPickIndex]
  const tote = pick
    ? session.cart.totes.find((t) => t.toteId === pick.targetToteId)
    : undefined

  switch (step) {
    // ── Build Cart screens ──────────────────────────────────────────────

    case WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD Logistics" },
          { value: "Command Center" },
          { label: "STATUS:", value: "Ready to Login" },
          { label: "ENTER:", value: "Continue" },
        ],
      }

    case WorkflowStep.BC_RECEIVE_TOTE_COUNT:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD Outbound" },
          { label: "TOTE COUNT:", value: "9 Totes" },
          { label: "STATUS:", value: "Assigned" },
          { label: "ENTER:", value: "Continue" },
        ],
      }

    case WorkflowStep.BC_OBTAIN_CART:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Pick Cart Setup" },
          { label: "CART TYPE:", value: "3-Tier Aluminum" },
          { label: "SLOTS:", value: "9 White Labels" },
          { label: "ENTER:", value: "Cart Staged" },
        ],
      }

    case WorkflowStep.BC_LOAD_TOTES:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Load 9 Gray Totes" },
          { label: "SLOTS 1-9:", value: "3 per tier" },
          { label: "STATUS:", value: "Loaded" },
          { label: "ENTER:", value: "Continue" },
        ],
      }

    case WorkflowStep.BC_LOGIN_RF:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD Logistics" },
          { label: "USER ID:", isCursorField: true },
          { label: "PASSWORD:", isCursorField: false },
        ],
        activeField: "USER ID",
        // NUMERIC → getInputMode returns TYPE → text input renders so the
        // trainee can type their User ID. Per BBWD-WI-030 §5.1.5.
        inputType: "NUMERIC",
      }

    // Per BBWD-WI-030 §5.1.6 — Type "1" for BBWD → Enter
    // ✓ validated against real device photos 2026-04-15
    // Top-level system selector: choose BBWD from available systems
    case WorkflowStep.BC_SELECT_BBWD:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD System" },
          { value: "1) BBWD" },
          { label: "SELECT:", isCursorField: true },
        ],
        activeField: "Select",
        inputType: "NUMERIC",
      }

    // Per BBWD-WI-030 §5.1.7 — Type "2" for Outbound Phase II → Enter
    case WorkflowStep.BC_SELECT_OUTBOUND:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD Menu" },
          { value: "1) Inbound" },
          { value: "2) Outbound Phase II" },
          { label: "SELECT:", isCursorField: true },
        ],
        activeField: "Select",
        inputType: "NUMERIC",
      }

    // ✓ validated against real device photos 2026-04-15
    case WorkflowStep.BC_PRESS_CTRL_T:
    case WorkflowStep.BC_CONFIRM_TASK_GROUP:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        // ✓ validated against BBWD-VJA-030 device capture:
        //   Update Task Group / Task Group:Z01 / Locn:_ / INT:*___ (*=ALL)
        lines: [
          { value: "Update Task Group" },
          { label: "Task Group:", value: formatTaskGroup(session.cart.taskGroup) },
          { label: "Locn:", isCursorField: true },
          { label: "INT:", value: "*___ (*=ALL)" },
        ],
        activeField: "Locn",
        inputType: "TEXT",
      }

    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Select Zone / Task Group" },
          { label: "ZONE:", isCursorField: true },
        ],
        activeField: "Zone",
        inputType: "BARCODE",
      }

    // Per BBWD-WI-030 §5.1.10 — [US only] Type "1" for Make Tote Cart BB → Enter
    // ✓ validated against real device photos 2026-04-15
    // Full function menu — shows all cart/picking/audit options + Whse/BU
    case WorkflowStep.BC_SELECT_MAKE_TOTE_CART:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "1 Make Tote Cart BB" },
          { value: "2 Pick Tote Cart BB" },
          { value: "3 RF Tote Audit" },
          { value: "4 Hospital" },
          { value: "5 HSP Unpack OLPN" },
          { value: "6 Ptwy Unpack OLPN BB" },
          { value: "Whse/BU :01/01" },
          { label: "Choice:", isCursorField: true },
        ],
        activeField: "Choice",
        inputType: "NUMERIC",
      }

    // ✓ validated against real device photos 2026-04-15
    // Per SIMULATION.md §RF Device Screen Generator example
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "Pick Cart #:", isCursorField: true },
        ],
        activeField: "Pick Cart #",
        inputType: "BARCODE",
      }

    // ✓ validated against real device photos 2026-04-15
    // Real device: cart # value on its own line below label, Slot and Tote below
    case WorkflowStep.BC_PLACE_TOTE_IN_SLOT:
    case WorkflowStep.BC_SCAN_TOTE_BARCODE: {
      const currentTote = session.cart.totes[session.currentToteSlot - 1]
      const toteLabel = currentTote?.barcode ?? ""
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "Pick Cart #:" },
          { value: session.cart.cartBarcode },
          { label: "Slot:", value: String(session.currentToteSlot) },
          { label: "Tote:", value: toteLabel || undefined, isCursorField: !toteLabel },
        ],
        activeField: "Tote",
        inputType: "BARCODE",
        contextualData: {
          slot: String(session.currentToteSlot),
          cartId: session.cart.cartId,
          cartBarcode: session.cart.cartBarcode,
        },
      }
    }

    // Per BBWD-WI-030 §5.1.15 — CTRL+E finalizes cart; transitions to Pick Phase
    // inputType KEYBOARD_SHORTCUT: the only valid input is pressing CTRL+E
    // via the soft key bar. activeField tells the soft key renderer which button
    // to highlight.
    case WorkflowStep.BC_PRESS_CTRL_E:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "Pick Cart #:", value: session.cart.cartBarcode },
          { value: `All ${MAX_TOTES_PER_CART} totes scanned` },
          { value: "Press CTRL+E to finalize" },
        ],
        inputType: "KEYBOARD_SHORTCUT",
        activeField: "CTRL+E",
      }

    // ── Pick screens ────────────────────────────────────────────────────

    case WorkflowStep.PK_PICKUP_CART:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Pick Cart Ready" },
          { label: "Cart #:", value: session.cart.cartBarcode },
          { label: "Totes:", value: "9 Staged" },
          { label: "ENTER:", value: "Start Picking" },
        ],
      }

    // ✓ validated against real device photos 2026-04-15
    // Per SIMULATION.md §RF Device Screen Generator (§5.2 pick display)
    // Real device shows: Tote, Aloc (highlighted), Item, Item (Last 4), Qty + Unit, Item Barcode: _
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "Tote:", value: tote?.barcode ?? tote?.toteId },
          {
            label: "Aloc:",
            value: pick?.location.displayLabel,
            isHighlighted: true,
          },
          { label: "Item:", value: pick?.item.sku },
          { label: "Item (Last 4):", value: pick?.item.lastFourDigits },
          {
            label: "Qty:",
            value: pick
              ? `${pick.quantityRequired} ${formatPickUnit(pick.quantityRequired, pick.item.unitOfMeasure)}`
              : undefined,
          },
          { label: "Item Barcode:", isCursorField: true },
        ],
        activeField: "Item Barcode",
        inputType: "BARCODE",
        contextualData: pick
          ? {
              toteId: tote?.toteId ?? "",
              location: pick.location.displayLabel,
              sku: pick.item.sku,
            }
          : undefined,
      }

    case WorkflowStep.PK_READ_PICK_DISPLAY:
    case WorkflowStep.PK_TRAVEL_TO_LOCATION:
    case WorkflowStep.PK_VERIFY_LOCATION:
    case WorkflowStep.PK_VERIFY_ITEM:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "Tote:", value: tote?.barcode ?? tote?.toteId },
          {
            label: "Aloc:",
            value: pick?.location.displayLabel,
            isHighlighted: true,
          },
          { label: "Item:", value: pick?.item.sku },
          { label: "Item (Last 4):", value: pick?.item.lastFourDigits },
          {
            label: "Qty:",
            value: pick
              ? `${pick.quantityRequired} ${formatPickUnit(pick.quantityRequired, pick.item.unitOfMeasure)}`
              : undefined,
          },
          { label: "Item Barcode:", isCursorField: true },
        ],
        activeField: "Item Barcode",
        inputType: "BARCODE",
      }

    case WorkflowStep.PK_PICK_QUANTITY:
    case WorkflowStep.PK_PLACE_IN_TOTE:
    case WorkflowStep.PK_ENTER_QUANTITY:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "TOTE:", value: tote?.barcode ?? tote?.toteId },
          { label: "QTY REQUIRED:", value: String(pick?.quantityRequired ?? "") },
          { label: "QTY PICKED:", isCursorField: true },
        ],
        activeField: "Qty Picked",
        inputType: "NUMERIC",
      }

    // ✓ validated against BBWD-VJA-030 device capture:
    //   Pick Tote Cart BB / Pick Cart:C000000083 / Slot:1 / Item:024505572 /
    //   Tote: / T00000000011692 / Tote: / _
    // The screen names the expected tote, then asks the picker to scan the
    // physical tote back — confirming the item landed in the slot the RF chose
    // (BBWD-WI-030 §5.2.9.2, §5.2.10).
    case WorkflowStep.PK_SCAN_TOTE_BARCODE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Pick Tote Cart BB" },
          { label: "Pick Cart:", value: session.cart.cartBarcode },
          { label: "Slot:", value: pick ? String(pick.targetSlot) : undefined },
          { label: "Item:", value: pick?.item.sku },
          { label: "Tote:" },
          { value: tote?.barcode ?? tote?.toteId },
          { label: "Tote:", isCursorField: true },
        ],
        activeField: "Tote",
        inputType: "BARCODE",
      }

    // Per SIMULATION.md §RF Device Screen Generator example and task spec.
    // inputType is KEYBOARD_SHORTCUT: the only valid input is pressing CTRL+A
    // via the soft key bar. activeField tells the soft key renderer which button
    // to highlight. Per BBWD-WI-030 §5.2.14–15.
    case WorkflowStep.PK_END_OF_TOTE_DISPLAY:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Info ---" },
          { value: "End Of Tote" },
        ],
        inputType: "KEYBOARD_SHORTCUT",
        activeField: "CTRL+A",
      }

    case WorkflowStep.PK_PRESS_CTRL_A:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Tote Complete" },
          { value: "Place tote on Putwall (Conveyor)" },
        ],
      }

    case WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Place Tote on Conveyor" },
          { value: "Press ENTER when done" },
        ],
      }

    case WorkflowStep.PS_ROUND_COMPLETE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Round Complete" },
          { value: "All picks finished" },
        ],
      }

    case WorkflowStep.PS_CONTINUE_NEXT_TOTE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Next Tote" },
          { value: "Continue picking" },
        ],
      }

    // ── Exception screens ───────────────────────────────────────────────

    case WorkflowStep.EX_TOTE_ALREADY_ALLOCATED:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Tote already allocated" },
          { value: "Set aside. Contact Lead." },
        ],
      }

    case WorkflowStep.EX_CART_ALREADY_CREATED:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Pick Cart Already Created" },
          { value: "Set aside. Contact Lead." },
        ],
      }

    case WorkflowStep.EX_INCORRECT_LOCATION:
    case WorkflowStep.EX_PRESS_CTRL_W:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Incorrect Location" },
          { value: "Press CTRL+W to go back" },
          { value: "Verify location on RF Device" },
        ],
      }

    case WorkflowStep.EX_INCORRECT_TOTE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Incorrect Tote" },
          { value: "Press CTRL+W to go back" },
          { value: "Verify tote barcode" },
        ],
      }

    case WorkflowStep.EX_INVALID_ITEM_LAST:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Invalid Item (last at location)" },
          { value: "Notify Lead" },
          { value: "Press CTRL+K to skip" },
        ],
      }

    case WorkflowStep.EX_INVALID_ITEM_NOT_LAST:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Invalid Item" },
          { value: "Notify Lead — tote to Putwall" },
          { value: "Item to IC" },
        ],
      }

    case WorkflowStep.EX_SHORT_INVENTORY:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Short Inventory" },
          { value: "Verify location" },
          { value: "Notify Lead" },
        ],
      }

    case WorkflowStep.EX_DAMAGED_ITEM:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "--- Error ---" },
          { value: "Damaged Item" },
          { value: "Place in Amnesty Bin" },
          { value: "(Ziplock bag first if leaking)" },
        ],
      }

    case WorkflowStep.EX_NOTIFY_LEAD:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Notify Lead / Supervisor" },
          { value: "Press ENTER when done" },
        ],
      }

    case WorkflowStep.EX_PRESS_CTRL_K:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Press CTRL+K to skip pick" },
        ],
      }

    case WorkflowStep.EX_ITEM_TO_AMNESTY_BIN:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Place item in Amnesty Bin" },
          { value: "(Ziplock bag first if leaking)" },
          { value: "Press ENTER when done" },
        ],
      }

    case WorkflowStep.EX_ITEM_TO_IC:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Place item in IC tote" },
          { value: "(Inventory Control)" },
          { value: "Press ENTER when done" },
        ],
      }

    // ── Pick-phase login/menu screens ────────────────────────────────────
    // Mirror BC_LOGIN_RF / BC_SELECT_BBWD / BC_SELECT_OUTBOUND for the
    // STANDALONE PICK MODE path (PK_PICKUP_CART → PK_LOGIN_RF → …).
    // Per BBWD-WI-030 §5.2.2–4.

    case WorkflowStep.PK_LOGIN_RF:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "BBWD Logistics" },
          { label: "USER ID:", isCursorField: true },
        ],
        activeField: "USER ID",
        inputType: "TEXT",
      }

    case WorkflowStep.PK_SELECT_BBWD:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "1 BBWD" },
          { value: "2 Inbound" },
          { value: "3 Audit" },
          { label: "Choice:", isCursorField: true },
        ],
        activeField: "Choice",
        inputType: "NUMERIC",
      }

    case WorkflowStep.PK_SELECT_OUTBOUND:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "1 Outbound Phase II" },
          { value: "2 Outbound Phase I" },
          { value: "3 Repack" },
          { label: "Choice:", isCursorField: true },
        ],
        activeField: "Choice",
        inputType: "NUMERIC",
      }

    default:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [{ value: step }],
      }
  }
}
