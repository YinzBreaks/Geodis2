/**
 * error-injector.ts — Error injection system and exception resolution map
 *
 * Handles all injected error logic for scored simulations:
 *  - Determining whether an error should be injected at the current pick
 *  - Defining the expected resolution sequence for each of the 8 §6 error types
 *  - Validating whether the user is following the correct resolution path
 *
 * Per SIMULATION.md §Error Injection System and BBWD-WI-030 §6
 */

import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
  type SimulationScenario,
  type SimulationError,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// INJECTED ERROR INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rich error descriptor returned when the injection system fires.
 * Contains everything the engine needs to create the correct SimulationError
 * and route to the right exception WorkflowStep.
 */
export interface InjectedError {
  /** The ScanResult to force regardless of what the user scanned */
  scanResult: ScanResult
  /**
   * For WRONG_ITEM: whether this was the last item at the pick location.
   * true  → EX_INVALID_ITEM_LAST  (CTRL+K → Putwall → Amnesty Bin)
   * false → EX_INVALID_ITEM_NOT_LAST (CTRL+K → Putwall → IC)
   * Per BBWD-WI-030 §6.5.1 vs §6.5.2
   */
  isLastItemAtLocation: boolean
  /** SOP reference for the injected scenario */
  sopReference: string
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTION RESOLUTION MAP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expected resolution sequence for each of the 8 BBWD-WI-030 §6 error types.
 * Order matters — each array defines the WorkflowSteps the picker must visit
 * in sequence to correctly resolve the exception.
 *
 * Note: WRONG_ITEM resolution terminates at EX_ITEM_TO_AMNESTY_BIN or
 * EX_ITEM_TO_IC depending on isLastItemAtLocation — both are listed; the
 * engine routes dynamically at PK_PLACE_TOTE_ON_CONVEYOR.
 *
 * Per BBWD-WI-030 §6
 */
export const EXCEPTION_RESOLUTION: Readonly<
  Partial<Record<ScanResult, WorkflowStep[]>>
> = {
  /** §6.5.1 — Wrong item, last at location: notify Lead → CTRL+K → Putwall → Amnesty Bin */
  [ScanResult.WRONG_ITEM]: [
    WorkflowStep.EX_NOTIFY_LEAD,
    WorkflowStep.EX_PRESS_CTRL_K,
    WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
    WorkflowStep.EX_ITEM_TO_AMNESTY_BIN, // or EX_ITEM_TO_IC — dynamic
  ],

  /** §6.3 — Wrong tote: CTRL+W → re-verify location/tote */
  [ScanResult.WRONG_TOTE]: [
    WorkflowStep.EX_PRESS_CTRL_W,
    WorkflowStep.PK_VERIFY_LOCATION,
  ],

  /** §6.4 — Wrong location: CTRL+W → re-verify location */
  [ScanResult.WRONG_LOCATION]: [
    WorkflowStep.EX_PRESS_CTRL_W,
    WorkflowStep.PK_VERIFY_LOCATION,
  ],

  /**
   * §6.1 — Tote already allocated: set aside, contact Lead/Supervisor.
   * No digital resolution steps in simulation (physical action only).
   */
  [ScanResult.TOTE_ALLOCATED]: [],

  /**
   * §6.2 — Cart already created: set aside, contact Lead/Supervisor.
   * No digital resolution steps in simulation (physical action only).
   */
  [ScanResult.CART_ALLOCATED]: [],

  /**
   * §6.6 — Short inventory: verify location → notify Lead → CTRL+K → skip → return.
   * Per SOP: picker verifies location, notifies lead, uses CTRL+K to skip pick.
   */
  [ScanResult.ITEM_NOT_FOUND]: [
    WorkflowStep.EX_NOTIFY_LEAD,
    WorkflowStep.EX_PRESS_CTRL_K,
    WorkflowStep.PK_READ_PICK_DISPLAY, // skip pick, continue
  ],

  /** §6.7 — Damaged item: Amnesty Bin (ziplock first if leaking). */
  [ScanResult.ITEM_DAMAGED]: [
    WorkflowStep.EX_ITEM_TO_AMNESTY_BIN,
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// INJECTION LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether an error should be injected at the current pick index.
 *
 * Injection overrides the user's actual scan — the injected error always
 * fires regardless of what barcode was scanned.
 * Per SIMULATION.md §Error Injection System
 *
 * @returns InjectedError descriptor, or null if no injection at this index
 */
export function getInjectedError(
  session: SimulationSession,
  scenario: SimulationScenario
): InjectedError | null {
  const injectScenario = scenario.errorScenarios.find(
    (e) => e.injectAtPickIndex === session.currentPickIndex
  )
  if (!injectScenario) return null

  // Guard: do not re-inject if this error already fired at this pick index.
  // An injected SimulationError records the pick index at which it occurred;
  // once it exists in session.errors the injection is considered "spent".
  // Per SIMULATION.md §Error Injection System: each injected error fires exactly once.
  const alreadyInjected = session.errors.some(
    (e) => e.injected && e.pickIndex === session.currentPickIndex
  )
  if (alreadyInjected) return null

  return {
    scanResult: injectScenario.errorType,
    isLastItemAtLocation: injectScenario.isLastItemAtLocation ?? true,
    sopReference: injectScenario.sopReference,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE ERROR LOOKUP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the most recent uncorrected SimulationError in the session.
 * Used by the engine for context-aware exception routing (CTRL+K, conveyor step).
 *
 * @returns The most recent uncorrected error, or null if none exists
 */
export function getActiveError(
  session: SimulationSession
): SimulationError | null {
  return [...session.errors].reverse().find((e) => !e.corrected) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUTION VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate whether the given step is the next expected step in the active
 * error's resolution sequence.
 *
 * Uses correctionSteps.length as the position pointer into EXCEPTION_RESOLUTION.
 *
 * @returns true if the step is the correct next resolution action; false otherwise
 */
export function validateExceptionResolution(
  session: SimulationSession,
  step: WorkflowStep
): boolean {
  const activeError = getActiveError(session)
  if (!activeError) return false

  const resolution = EXCEPTION_RESOLUTION[activeError.errorType]
  if (!resolution || resolution.length === 0) return false

  const nextExpectedStep = resolution[activeError.correctionSteps.length]
  return step === nextExpectedStep
}
