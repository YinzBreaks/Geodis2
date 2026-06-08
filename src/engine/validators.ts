/**
 * validators.ts — Scan validation and action permission checks
 *
 * All scan validation logic lives here — the UI never decides if a scan is
 * correct. Per SIMULATION.md §Validation Rules and §Critical Engine Rules.
 *
 * Per BBWD-WI-030 §5.1 (Build Cart) and §5.2 (Pick)
 */

import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
  type EngineAction,
} from "@/types/domain"
import { findTransition } from "@/engine/transitions"

const MAX_TOTES_PER_CART = 9 // Per BBWD-WI-030 §5.1: always 9 totes

// ─────────────────────────────────────────────────────────────────────────────
// SCAN VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a barcode scan at the current workflow step.
 *
 * Every scan must be validated before state advances.
 * Per SIMULATION.md §Validation Rules §Scan Validation
 *
 * @returns ScanResult indicating success or the specific error type
 */
export function validateScan(
  step: WorkflowStep,
  scannedValue: string,
  session: SimulationSession
): ScanResult {
  switch (step) {
    // Per BBWD-WI-030 §5.1.11 — Scan the Pick Cart barcode.
    // Bug 3 fix: accept any non-empty scan — teaches scanning habit without
    // requiring trainees to memorise exact barcode strings.
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return scannedValue.trim().length > 0 ? ScanResult.SUCCESS : ScanResult.WRONG_ITEM

    // Per BBWD-WI-030 §5.1.12 — Scan each tote barcode into its slot.
    // Bug 3 fix: accept any non-empty scan — teaches scanning habit.
    // TOTE_ALLOCATED check is kept: scanning the same barcode twice is a real
    // exception that trainees need to practice handling.
    case WorkflowStep.BC_SCAN_TOTE_BARCODE: {
      if (toteAlreadyAllocated(scannedValue, session)) return ScanResult.TOTE_ALLOCATED
      return scannedValue.trim().length > 0 ? ScanResult.SUCCESS : ScanResult.WRONG_TOTE
    }

    // Per BBWD-WI-030 §5.1.9 — Scan zone or FEX barcode
    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      // Zone barcodes are validated against the session cart's zone
      return scannedValue === session.cart.taskGroup
        ? ScanResult.SUCCESS
        : ScanResult.WRONG_ITEM

    // Per BBWD-WI-030 §5.2.9 — Scan item UPC barcode
    case WorkflowStep.PK_SCAN_ITEM_UPC: {
      const currentPick = session.pickQueue[session.currentPickIndex]
      if (!currentPick) return ScanResult.ITEM_NOT_FOUND
      return scannedValue === currentPick.item.upcBarcode
        ? ScanResult.SUCCESS
        : ScanResult.WRONG_ITEM
    }

    // Per BBWD-WI-030 §5.2.13 — Scan the Pick Tote barcode shown on RF Device.
    // Bug 3/6 fix: accept any non-empty scan — teaches tote-scanning habit and
    // allows the pick counter to advance. The trainee already assigned tote barcodes
    // during BC phase; requiring exact recall in PK phase is not the training goal.
    case WorkflowStep.PK_SCAN_TOTE_BARCODE:
      return scannedValue.trim().length > 0 ? ScanResult.SUCCESS : ScanResult.WRONG_TOTE

    // For steps that accept a scan but have no strict value validation
    // (e.g. zone barcode where any valid zone is accepted)
    default:
      return ScanResult.SUCCESS
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION PERMISSION CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether an action is permitted at the current workflow step.
 *
 * Returns null if permitted, or a feedback string explaining why it is blocked.
 * Per SIMULATION.md §Sequence Enforcement
 *
 * @returns null if permitted, feedback message if blocked
 */
export function isActionPermitted(
  session: SimulationSession,
  action: EngineAction
): string | null {
  const transition = findTransition(session.currentStep, action)

  // No matching transition at all — action is not valid for this step
  if (!transition) {
    return buildNoTransitionMessage(session.currentStep, action)
  }

  // Delegate to the transition's guard for domain-specific enforcement
  return transition.guard(session, action)
}

// ─────────────────────────────────────────────────────────────────────────────
// QUANTITY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a quantity entry against the current pick task.
 *
 * Per SIMULATION.md §Quantity Validation
 * Note: Partial quantities may be valid — confirm with domain expert.
 */
export function validateQuantity(input: string, session: SimulationSession): boolean {
  const pick = session.pickQueue[session.currentPickIndex]
  if (!pick) return false
  const qty = parseInt(input, 10)
  return !isNaN(qty) && qty > 0 && qty <= pick.quantityRequired
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a tote barcode has already been allocated to a different slot.
 * Prevents duplicate tote scans. Per BBWD-WI-030 §6.1 (Tote already allocated).
 */
function toteAlreadyAllocated(
  barcode: string,
  session: SimulationSession
): boolean {
  return session.cart.totes.some(
    (t) => t.barcode === barcode && t.slot !== session.currentToteSlot
  )
}

/**
 * Build a human-readable feedback message when no transition matches.
 */
function buildNoTransitionMessage(
  step: WorkflowStep,
  action: EngineAction
): string {
  switch (action.type) {
    case "KEY_PRESS": {
      const { keys } = action
      if (keys === "CTRL+E") {
        return "Please scan all tote slots first"
      }
      if (keys === "CTRL+A") {
        return "No tote completion pending"
      }
      return `Key ${keys} is not valid at this step`
    }
    case "SCAN":
      return "Complete previous step first"
    case "TYPE":
      return `Input not expected at step: ${step}`
    case "CONFIRM":
      return `Confirmation not expected at step: ${step}`
  }
}
