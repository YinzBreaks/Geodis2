/**
 * stepLabels.ts — Human-readable labels for every WorkflowStep
 *
 * Used by ReplayTimeline, CoachingPanel, and any other view that displays
 * a step name to a user. These labels match the coaching content titles
 * where applicable.
 *
 * Per CLAUDE.md §Naming Conventions: WorkflowStep enums → human-readable text.
 * Export a pure map and a helper — no React dependencies.
 */

import { WorkflowStep } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// STEP LABEL MAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable label for every WorkflowStep.
 * Carets (^) denote keyboard shortcuts as they appear on the soft key bar.
 */
export const STEP_LABELS: Record<WorkflowStep, string> = {
  // ── Build Cart ──────────────────────────────────────────────────────────
  [WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER]: "Travel to Command Center",
  [WorkflowStep.BC_RECEIVE_TOTE_COUNT]:        "Receive Tote Count from Lead",
  [WorkflowStep.BC_OBTAIN_CART]:               "Obtain Pick Cart",
  [WorkflowStep.BC_LOAD_TOTES]:                "Load Totes onto Cart",
  [WorkflowStep.BC_LOGIN_RF]:                  "Log In to RF Device",
  [WorkflowStep.BC_SELECT_BBWD]:               "Select BBWD",
  [WorkflowStep.BC_SELECT_OUTBOUND]:           "Select Outbound Phase II",
  [WorkflowStep.BC_PRESS_CTRL_T]:              "Press ^T — Change Task Group",
  [WorkflowStep.BC_CONFIRM_TASK_GROUP]:        "Confirm Task Group",
  [WorkflowStep.BC_SCAN_ZONE_TASK_GROUP]:      "Scan Zone / Task Group",
  [WorkflowStep.BC_SELECT_MAKE_TOTE_CART]:     "Select Make Tote Cart",
  [WorkflowStep.BC_SCAN_CART_BARCODE]:         "Scan Pick Cart",
  [WorkflowStep.BC_PLACE_TOTE_IN_SLOT]:        "Place Tote in Slot",
  [WorkflowStep.BC_SCAN_TOTE_BARCODE]:         "Scan Pick Tote",
  [WorkflowStep.BC_PRESS_CTRL_E]:              "Press ^E — Finalize Cart",

  // ── Pick Phase ──────────────────────────────────────────────────────────
  [WorkflowStep.PK_PICKUP_CART]:               "Pick Up Cart",
  [WorkflowStep.PK_LOGIN_RF]:                  "Log In to RF Device (Pick)",
  [WorkflowStep.PK_SELECT_BBWD]:               "Select BBWD (Pick)",
  [WorkflowStep.PK_SELECT_OUTBOUND]:           "Select Outbound Phase II (Pick)",
  [WorkflowStep.PK_READ_PICK_DISPLAY]:         "Read Pick Display",
  [WorkflowStep.PK_TRAVEL_TO_LOCATION]:        "Navigate to Pick Location",
  [WorkflowStep.PK_VERIFY_LOCATION]:           "Verify Pick Location",
  [WorkflowStep.PK_VERIFY_ITEM]:               "Verify Item",
  [WorkflowStep.PK_SCAN_ITEM_UPC]:             "Scan Item UPC",
  [WorkflowStep.PK_PICK_QUANTITY]:             "Pick Quantity",
  [WorkflowStep.PK_PLACE_IN_TOTE]:             "Place Item in Tote",
  [WorkflowStep.PK_ENTER_QUANTITY]:            "Enter Quantity",
  [WorkflowStep.PK_SCAN_TOTE_BARCODE]:         "Scan Pick Tote",

  // ── End of Tote ─────────────────────────────────────────────────────────
  [WorkflowStep.PK_END_OF_TOTE_DISPLAY]:       "End of Tote",
  [WorkflowStep.PK_PRESS_CTRL_A]:              "Press ^A — Confirm Tote Complete",
  [WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR]:    "Stage Completed Tote",

  // ── Pick Stage ──────────────────────────────────────────────────────────
  [WorkflowStep.PS_CONTINUE_NEXT_TOTE]:        "Continue — Next Tote",
  [WorkflowStep.PS_TRASH_PICKUP]:              "Trash Pickup",
  [WorkflowStep.PS_LAST_ITEM_IN_BOX]:          "Last Item in Box",
  [WorkflowStep.PS_LAST_ITEM_ON_PALLET]:       "Last Item on Pallet",
  [WorkflowStep.PS_ROUND_COMPLETE]:            "Round Complete",

  // ── Exception Handling ──────────────────────────────────────────────────
  [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]:    "Exception: Tote Already Allocated",
  [WorkflowStep.EX_CART_ALREADY_CREATED]:      "Exception: Cart Already Created",
  [WorkflowStep.EX_INCORRECT_LOCATION]:        "Exception: Incorrect Location",
  [WorkflowStep.EX_INCORRECT_TOTE]:            "Exception: Incorrect Tote",
  [WorkflowStep.EX_INVALID_ITEM_LAST]:         "Exception: Wrong Item (Last at Location)",
  [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]:     "Exception: Wrong Item",
  [WorkflowStep.EX_SHORT_INVENTORY]:           "Exception: Short Inventory",
  [WorkflowStep.EX_DAMAGED_ITEM]:              "Exception: Damaged Item",
  [WorkflowStep.EX_PRESS_CTRL_W]:              "Press ^W — Go Back",
  [WorkflowStep.EX_PRESS_CTRL_K]:              "Press ^K — Skip Pick",
  [WorkflowStep.EX_NOTIFY_LEAD]:               "Notify Lead / Supervisor",
  [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]:       "Item to Amnesty Bin",
  [WorkflowStep.EX_ITEM_TO_IC]:                "Item to Inventory Control",
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the human-readable label for a WorkflowStep string.
 * Falls back to a formatted version of the raw string for unknown values.
 *
 * @param step — WorkflowStep enum value or raw string
 */
export function formatStepLabel(step: string): string {
  if (step in STEP_LABELS) {
    return STEP_LABELS[step as WorkflowStep]
  }
  // Fallback: strip prefix and title-case the remainder
  return step
    .replace(/^BC_|^PK_|^PS_|^EX_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
