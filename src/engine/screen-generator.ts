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
        inputType: "TEXT",
      }

    case WorkflowStep.BC_SELECT_BBWD:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Main Menu" },
          { value: "1) BBWD" },
          { value: "2) Other" },
          { label: "SELECT:", isCursorField: true },
        ],
        activeField: "Select",
        inputType: "NUMERIC",
      }

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

    case WorkflowStep.BC_PRESS_CTRL_T:
    case WorkflowStep.BC_CONFIRM_TASK_GROUP:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Task Group" },
          { label: "GROUP:", value: session.cart.taskGroup },
          { value: "Press ENTER to confirm" },
        ],
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

    case WorkflowStep.BC_SELECT_MAKE_TOTE_CART:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Cart Type" },
          { value: "1) Make Tote Cart BB" },
          { label: "SELECT:", isCursorField: true },
        ],
        activeField: "Select",
        inputType: "NUMERIC",
      }

    // Per SIMULATION.md §RF Device Screen Generator example
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "PICK CART #:", isCursorField: true },
        ],
        activeField: "Pick Cart #",
        inputType: "BARCODE",
      }

    case WorkflowStep.BC_PLACE_TOTE_IN_SLOT:
    case WorkflowStep.BC_SCAN_TOTE_BARCODE: {
      // Show the already-scanned barcode for the current slot (if any), or blank.
      // Per task spec: "Tote: {toteId or blank if not yet scanned}"
      const currentTote = session.cart.totes[session.currentToteSlot - 1]
      const toteLabel = currentTote?.barcode ?? ""
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { value: "Make Tote Cart BB" },
          { label: "PICK CART #:", value: session.cart.cartBarcode },
          { label: "SLOT:", value: String(session.currentToteSlot) },
          { label: "TOTE:", value: toteLabel || undefined },
          { label: "SCAN TOTE:", isCursorField: true },
        ],
        activeField: "Scan Tote",
        inputType: "BARCODE",
        contextualData: {
          slot: String(session.currentToteSlot),
          cartId: session.cart.cartId,
          cartBarcode: session.cart.cartBarcode,
        },
      }
    }

    // ── Pick screens ────────────────────────────────────────────────────

    // Per SIMULATION.md §RF Device Screen Generator (§5.2 pick display)
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "TOTE:", value: tote?.barcode ?? tote?.toteId },
          {
            label: "ALOC:",
            value: pick?.location.displayLabel,
            isHighlighted: true,
          },
          { label: "ITEM:", value: pick?.item.sku },
          { label: "ITEM (LAST 4):", value: pick?.item.lastFourDigits },
          {
            label: `QTY: ${pick?.quantityRequired ?? ""}`,
            value: pick?.item.unitOfMeasure,
          },
          { label: "ITEM BARCODE:", isCursorField: true },
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
          { label: "TOTE:", value: tote?.barcode ?? tote?.toteId },
          {
            label: "ALOC:",
            value: pick?.location.displayLabel,
            isHighlighted: true,
          },
          { label: "ITEM:", value: pick?.item.sku },
          { label: "ITEM (LAST 4):", value: pick?.item.lastFourDigits },
          {
            label: `QTY: ${pick?.quantityRequired ?? ""}`,
            value: pick?.item.unitOfMeasure,
          },
          { label: "ITEM BARCODE:", isCursorField: true },
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

    case WorkflowStep.PK_SCAN_TOTE_BARCODE:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [
          { label: "SCAN TOTE:", isCursorField: true },
          { value: tote?.barcode ?? tote?.toteId },
        ],
        activeField: "Scan Tote",
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

    default:
      return {
        screenId: `screen-${step}`,
        workflowStep: step,
        lines: [{ value: step }],
      }
  }
}
