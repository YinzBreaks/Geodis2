/**
 * simulation-engine.ts — Pure TypeScript simulation state machine
 *
 * Architecture: Action → dispatch() → new SimulationSession → React re-render
 *
 * Critical rules (from SIMULATION.md §Critical Engine Rules):
 * 1. Engine is pure — no side effects, no API calls, no React imports
 * 2. Never auto-advance physical steps — travel/placing require confirmAction
 * 3. All scan validation is in the engine — UI never decides correctness
 * 4. Error injection overrides user input
 * 5. CTRL+E only valid when slot 9 is complete
 * 6. Session state is immutable — every dispatch returns a NEW object
 * 7. Every ScanEvent is logged — including failures
 */

import {
  WorkflowStep,
  ScanResult,
  ContentType,
  DifficultyLevel,
  type SimulationSession,
  type SimulationScenario,
  type PickCart,
  type PickTask,
  type PickedItem,
  type ScanEvent,
  type SimulationError,
  type RFDeviceScreen,
  type EngineResult,
  type EngineAction,
  type SessionScore,
  type ToteSlot,
  type Tote,
} from "@/types/domain"
import {
  validateScan,
  isActionPermitted,
  validateQuantity,
} from "@/engine/validators"
import { findTransition, ERROR_ENTRY_STEPS } from "@/engine/transitions"
import {
  getInjectedError,
  getActiveError,
  type InjectedError,
} from "@/engine/error-injector"
import { calculateScore as _calculateScore } from "@/engine/scorer"
import { generateScreen } from "@/engine/screen-generator"

const MAX_TOTES_PER_CART = 9

// ─────────────────────────────────────────────────────────────────────────────
// SESSION FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize a new simulation session from a scenario definition.
 * The session begins at the first step of the scenario's workflow.
 *
 * Per SIMULATION.md §Engine API
 */
export function startSession(
  userId: string,
  scenario: SimulationScenario
): SimulationSession {
  const sessionId = generateId("session")
  const now = new Date()

  // Build an empty Pick Cart with 9 placeholder totes (pre-populated for scanning)
  const cart = buildEmptyCart(sessionId, scenario)

  return {
    sessionId,
    userId,
    moduleId: scenario.moduleId,
    moduleType: ContentType.SIMULATION,
    difficulty: scenario.difficulty,

    cart,
    pickQueue: scenario.steps
      .filter((s) => s.workflowStep === WorkflowStep.PK_SCAN_ITEM_UPC)
      .map(() => ({} as PickTask)), // Placeholder — real pick tasks provided by scenario data layer

    completedPicks: [],

    currentStep: WorkflowStep.BC_LOGIN_RF,
    currentPickIndex: 0,
    currentToteSlot: 1 as ToteSlot,

    scanEvents: [],
    errors: [],

    startedAt: now,
    status: "IN_PROGRESS",
  }
}

/**
 * Initialize a new simulation session with an explicit pick queue.
 * Use this overload when the caller supplies PickTask[] from a scenario data layer.
 */
export function startSessionWithTasks(
  userId: string,
  scenario: SimulationScenario,
  pickQueue: PickTask[],
  cart: PickCart
): SimulationSession {
  const sessionId = generateId("session")
  return {
    sessionId,
    userId,
    moduleId: scenario.moduleId,
    moduleType: ContentType.SIMULATION,
    difficulty: scenario.difficulty,

    cart,
    pickQueue,
    completedPicks: [],

    currentStep: WorkflowStep.BC_LOGIN_RF,
    currentPickIndex: 0,
    currentToteSlot: 1 as ToteSlot,

    scanEvents: [],
    errors: [],

    startedAt: new Date(),
    status: "IN_PROGRESS",
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH — THE CORE STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Submit an action to the engine and receive a new session state.
 *
 * Session state is immutable — this always returns a new SimulationSession object.
 * Per SIMULATION.md §Engine API, §Critical Engine Rules
 */
export function dispatch(
  session: SimulationSession,
  action: EngineAction,
  scenario?: SimulationScenario
): { session: SimulationSession; result: EngineResult } {
  // 1. Check if action is permitted at this step
  const permissionError = isActionPermitted(session, action)
  if (permissionError !== null) {
    return {
      session,
      result: {
        success: false,
        newStep: session.currentStep,
        feedback: permissionError,
      },
    }
  }

  // 2. Route to the appropriate handler
  switch (action.type) {
    case "SCAN":
      return handleScan(session, action.value, scenario)
    case "KEY_PRESS":
      return handleKeyPress(session, action.keys, scenario)
    case "TYPE":
      return handleType(session, action.text)
    case "CONFIRM":
      return handleConfirm(session, action.step)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION HANDLERS (all return new session, never mutate)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handle a barcode scan action.
 * Validates the scan, logs the event, advances or stays depending on result.
 */
function handleScan(
  session: SimulationSession,
  scannedValue: string,
  scenario?: SimulationScenario
): { session: SimulationSession; result: EngineResult } {
  const step = session.currentStep
  const scanStartMs = Date.now()

  // Check for error injection at PK_SCAN_ITEM_UPC — overrides actual scan value
  let scanResult: ScanResult
  let injectedError: InjectedError | null = null

  if (scenario && step === WorkflowStep.PK_SCAN_ITEM_UPC) {
    injectedError = getInjectedError(session, scenario)
    scanResult = injectedError
      ? injectedError.scanResult
      : validateScan(step, scannedValue, session)
  } else {
    scanResult = validateScan(step, scannedValue, session)
  }

  // Build the scan event (always logged — even on failure)
  const scanEvent: ScanEvent = {
    scanEventId: generateId("scan"),
    sessionId: session.sessionId,
    step,
    expectedValue: getExpectedScanValue(step, session),
    scannedValue,
    result: scanResult,
    timestamp: new Date(),
    responseTimeMs: Date.now() - scanStartMs,
  }

  if (scanResult !== ScanResult.SUCCESS) {
    // Determine the exception entry step.
    // WRONG_ITEM routes to LAST or NOT_LAST based on injection metadata.
    let errorStep: WorkflowStep
    if (scanResult === ScanResult.WRONG_ITEM) {
      const isLast = injectedError ? injectedError.isLastItemAtLocation : true
      errorStep = isLast
        ? WorkflowStep.EX_INVALID_ITEM_LAST
        : WorkflowStep.EX_INVALID_ITEM_NOT_LAST
    } else {
      errorStep = ERROR_ENTRY_STEPS[scanResult] ?? session.currentStep
    }

    const simError: SimulationError = {
      errorId: generateId("err"),
      sessionId: session.sessionId,
      step,
      errorType: scanResult,
      injected: injectedError !== null,
      corrected: false,
      correctionSteps: [],
      occurredAt: new Date(),
      isLastItemAtLocation: injectedError?.isLastItemAtLocation,
      // Record pick index so the re-injection guard in error-injector can
      // identify that this error has already fired at this position.
      // Per SIMULATION.md §Error Injection System
      pickIndex: session.currentPickIndex,
    }

    const newSession: SimulationSession = {
      ...session,
      currentStep: errorStep,
      scanEvents: [...session.scanEvents, scanEvent],
      errors: [...session.errors, simError],
    }

    return {
      session: newSession,
      result: {
        success: false,
        newStep: errorStep,
        scanResult,
        feedback: buildErrorFeedback(scanResult, step),
      },
    }
  }

  // Scan succeeded — advance the state machine
  const nextSession = advanceAfterSuccessfulScan(session, scanEvent)

  return {
    session: nextSession,
    result: {
      success: true,
      newStep: nextSession.currentStep,
      scanResult: ScanResult.SUCCESS,
    },
  }
}

/**
 * Handle a key press action (CTRL+E, CTRL+A, CTRL+T, CTRL+W, CTRL+K, etc.)
 */
function handleKeyPress(
  session: SimulationSession,
  keys: string,
  _scenario?: SimulationScenario
): { session: SimulationSession; result: EngineResult } {
  const transition = findTransition(session.currentStep, {
    type: "KEY_PRESS",
    keys,
  })
  if (!transition) {
    return noTransitionResult(session, `Key ${keys} is not valid at this step`)
  }

  let nextStep = transition.nextStep

  // Special handling for CTRL+E: transitions into the Pick Phase
  if (keys === "CTRL+E") {
    nextStep = WorkflowStep.PK_READ_PICK_DISPLAY
  }

  // Dynamic CTRL+K routing: WRONG_ITEM errors require tote-to-conveyor before
  // amnesty bin; all other errors (ITEM_NOT_FOUND) skip directly to pick display.
  // Per BBWD-WI-030 §6.5.1 vs §6.6
  if (keys === "CTRL+K") {
    const activeError = getActiveError(session)
    if (activeError && activeError.errorType === ScanResult.WRONG_ITEM) {
      nextStep = WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR
    } else if (activeError && activeError.errorType === ScanResult.ITEM_NOT_FOUND) {
      // Mark the SHORT_INVENTORY error as corrected — picker acknowledged with CTRL+K
      const updatedErrors = markActiveErrorCorrected(session.errors)
      const newSession: SimulationSession = {
        ...session,
        currentStep: WorkflowStep.PK_READ_PICK_DISPLAY,
        errors: updatedErrors,
      }
      return {
        session: newSession,
        result: { success: true, newStep: WorkflowStep.PK_READ_PICK_DISPLAY },
      }
    }
    // else: no active error, stays PK_READ_PICK_DISPLAY (from transition)
  }

  const newSession: SimulationSession = {
    ...session,
    currentStep: nextStep,
    // Mark cart as built when CTRL+E is pressed
    ...(keys === "CTRL+E"
      ? { cart: { ...session.cart, isBuilt: true } }
      : {}),
  }

  return {
    session: newSession,
    result: { success: true, newStep: nextStep },
  }
}

/**
 * Handle a text type action (typing "1", "2", quantity, etc.)
 */
function handleType(
  session: SimulationSession,
  text: string
): { session: SimulationSession; result: EngineResult } {
  // Quantity entry has its own validation path
  if (session.currentStep === WorkflowStep.PK_ENTER_QUANTITY) {
    if (!validateQuantity(text, session)) {
      return {
        session,
        result: {
          success: false,
          newStep: session.currentStep,
          feedback: "Invalid quantity — must be a positive number not exceeding the required amount",
        },
      }
    }
    // Advance to tote scan
    const newSession: SimulationSession = {
      ...session,
      currentStep: WorkflowStep.PK_SCAN_TOTE_BARCODE,
    }
    return {
      session: newSession,
      result: { success: true, newStep: WorkflowStep.PK_SCAN_TOTE_BARCODE },
    }
  }

  const transition = findTransition(session.currentStep, {
    type: "TYPE",
    text,
  })
  if (!transition) {
    return noTransitionResult(session, `"${text}" is not valid at this step`)
  }

  const newSession: SimulationSession = {
    ...session,
    currentStep: transition.nextStep,
  }

  return {
    session: newSession,
    result: { success: true, newStep: transition.nextStep },
  }
}

/**
 * Handle a physical confirmation action (travel, place item, etc.)
 * Per SIMULATION.md: physical steps must never auto-advance.
 */
function handleConfirm(
  session: SimulationSession,
  confirmedStep: WorkflowStep
): { session: SimulationSession; result: EngineResult } {
  const transition = findTransition(session.currentStep, {
    type: "CONFIRM",
    step: confirmedStep,
  })
  if (!transition) {
    return noTransitionResult(
      session,
      `Confirmation not expected at step: ${session.currentStep}`
    )
  }

  let nextStep = transition.nextStep

  // Dynamic branching at PK_PLACE_TOTE_ON_CONVEYOR:
  // - If an active (uncorrected) WRONG_ITEM error exists → route to amnesty/IC
  // - Otherwise → continue next tote or complete round
  // Per BBWD-WI-030 §5.2.17, §6.5.1, §6.5.2
  if (session.currentStep === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR) {
    const activeError = getActiveError(session)
    if (activeError) {
      // Route to Amnesty Bin if last item at location, otherwise IC
      nextStep =
        activeError.isLastItemAtLocation !== false
          ? WorkflowStep.EX_ITEM_TO_AMNESTY_BIN
          : WorkflowStep.EX_ITEM_TO_IC
    } else {
      const morePicksRemain = session.currentPickIndex < session.pickQueue.length
      nextStep = morePicksRemain
        ? WorkflowStep.PS_CONTINUE_NEXT_TOTE
        : WorkflowStep.PS_ROUND_COMPLETE
    }
  }

  // At EX_ITEM_TO_AMNESTY_BIN or EX_ITEM_TO_IC: mark the active error corrected
  // before returning to the pick display. Per BBWD-WI-030 §6.5.1/§6.5.2
  let updatedErrors = session.errors
  if (
    session.currentStep === WorkflowStep.EX_ITEM_TO_AMNESTY_BIN ||
    session.currentStep === WorkflowStep.EX_ITEM_TO_IC
  ) {
    updatedErrors = markActiveErrorCorrected(session.errors)
  }

  const newSession: SimulationSession = {
    ...session,
    currentStep: nextStep,
    errors: updatedErrors,
  }

  return {
    session: newSession,
    result: { success: true, newStep: nextStep },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE ADVANCE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance the session state after a successful scan.
 * Handles the dynamic branching logic (slot counting, pick looping, End Of Tote).
 */
function advanceAfterSuccessfulScan(
  session: SimulationSession,
  scanEvent: ScanEvent
): SimulationSession {
  const step = session.currentStep

  switch (step) {
    // ── Build Cart: tote scanning ────────────────────────────────────────
    case WorkflowStep.BC_SCAN_TOTE_BARCODE: {
      const slotIndex = session.currentToteSlot - 1
      const updatedTotes = session.cart.totes.map((t, i) =>
        i === slotIndex ? { ...t, barcode: scanEvent.scannedValue } : t
      )
      const updatedCart = { ...session.cart, totes: updatedTotes }

      // After all 9 totes scanned, stay at BC_SCAN_TOTE_BARCODE
      // (waiting for CTRL+E) — otherwise advance to next slot placement
      const allScanned = session.currentToteSlot === MAX_TOTES_PER_CART
      const nextStep = allScanned
        ? WorkflowStep.BC_SCAN_TOTE_BARCODE // Waiting for CTRL+E
        : WorkflowStep.BC_PLACE_TOTE_IN_SLOT

      const nextSlot = allScanned
        ? session.currentToteSlot
        : ((session.currentToteSlot + 1) as ToteSlot)

      return {
        ...session,
        cart: updatedCart,
        currentStep: nextStep,
        currentToteSlot: nextSlot,
        scanEvents: [...session.scanEvents, scanEvent],
      }
    }

    // ── Pick: item UPC scan ──────────────────────────────────────────────
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return {
        ...session,
        currentStep: WorkflowStep.PK_PICK_QUANTITY,
        scanEvents: [...session.scanEvents, scanEvent],
      }

    // ── Pick: tote barcode scan ──────────────────────────────────────────
    case WorkflowStep.PK_SCAN_TOTE_BARCODE: {
      const currentPick = session.pickQueue[session.currentPickIndex]

      // Record the completed pick
      const pickedItem: PickedItem = {
        pickTaskId: currentPick.pickTaskId,
        item: currentPick.item,
        quantityPicked: currentPick.quantityRequired,
        scannedAt: new Date(),
      }

      // Mark the tote as having received this item
      const updatedTotes = session.cart.totes.map((t) =>
        t.slot === currentPick.targetSlot
          ? { ...t, pickedItems: [...t.pickedItems, pickedItem] }
          : t
      )

      const nextPickIndex = session.currentPickIndex + 1
      const isEndOfTote = isLastPickForCurrentTote(session)

      // Always route through End Of Tote display when tote is complete —
      // even for the very last pick. PS_ROUND_COMPLETE is set from
      // PK_PLACE_TOTE_ON_CONVEYOR confirmation. Per BBWD-WI-030 §5.2.14–17.
      const nextStep = isEndOfTote
        ? WorkflowStep.PK_END_OF_TOTE_DISPLAY
        : WorkflowStep.PK_READ_PICK_DISPLAY

      // Update total items picked on the cart
      const updatedCart: PickCart = {
        ...session.cart,
        totes: updatedTotes,
        totalItemsPicked: session.cart.totalItemsPicked + 1,
      }

      return {
        ...session,
        cart: updatedCart,
        completedPicks: [...session.completedPicks, pickedItem],
        currentPickIndex: nextPickIndex,
        currentStep: nextStep,
        scanEvents: [...session.scanEvents, scanEvent],
      }
    }

    // ── Cart barcode scan ────────────────────────────────────────────────
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return {
        ...session,
        currentStep: WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
        scanEvents: [...session.scanEvents, scanEvent],
      }

    // ── Zone task group scan ─────────────────────────────────────────────
    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      return {
        ...session,
        currentStep: WorkflowStep.BC_SELECT_MAKE_TOTE_CART,
        scanEvents: [...session.scanEvents, scanEvent],
      }

    default:
      return {
        ...session,
        scanEvents: [...session.scanEvents, scanEvent],
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RF DEVICE SCREEN — DELEGATES TO screen-generator.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the correct RFDeviceScreen for the current workflow step.
 *
 * The engine drives all display — the UI only renders what the engine returns.
 * Per SIMULATION.md §RF Device Screen Generator
 */
export function getCurrentScreen(session: SimulationSession): RFDeviceScreen {
  return generateScreen(session)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORING — DELEGATES TO scorer.ts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate final score for a completed session.
 * Per SIMULATION.md §Scoring Engine and CLAUDE.md: (accuracy × 0.6) + (speed × 0.4)
 *
 * Re-exported from scorer.ts for backward compatibility with existing imports.
 */
export function calculateScore(
  session: SimulationSession,
  scenario: SimulationScenario
): SessionScore {
  return _calculateScore(session, scenario)
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an empty Pick Cart with 9 placeholder totes for a new session.
 * Totes will have their barcodes filled in during BC_SCAN_TOTE_BARCODE steps.
 */
function buildEmptyCart(sessionId: string, scenario: SimulationScenario): PickCart {
  const totes: Tote[] = Array.from(
    { length: MAX_TOTES_PER_CART },
    (_, i) => ({
      toteId: `tote-${sessionId}-slot-${i + 1}`,
      barcode: "", // Filled in as user scans
      slot: (i + 1) as ToteSlot,
      pickedItems: [],
      isComplete: false,
      placedOnConveyor: false,
    })
  )

  return {
    cartId: generateId("cart"),
    cartBarcode: "",
    totes,
    zone: scenario.zone,
    taskGroup: scenario.zone,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  }
}

/**
 * Determine whether the current pick is the last pick that should go into
 * the current tote (triggering End Of Tote on the next tote scan).
 */
function isLastPickForCurrentTote(session: SimulationSession): boolean {
  if (session.currentPickIndex >= session.pickQueue.length - 1) {
    // This is the very last pick in the queue
    return true
  }
  const currentPick = session.pickQueue[session.currentPickIndex]
  const nextPick = session.pickQueue[session.currentPickIndex + 1]
  // End Of Tote when next pick targets a different tote
  return currentPick.targetToteId !== nextPick.targetToteId
}

/**
 * Get the expected scan value for logging purposes.
 */
function getExpectedScanValue(
  step: WorkflowStep,
  session: SimulationSession
): string {
  switch (step) {
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return session.cart.cartBarcode
    case WorkflowStep.BC_SCAN_TOTE_BARCODE:
      return session.cart.totes[session.currentToteSlot - 1]?.barcode ?? ""
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return (
        session.pickQueue[session.currentPickIndex]?.item.upcBarcode ?? ""
      )
    case WorkflowStep.PK_SCAN_TOTE_BARCODE: {
      const pick = session.pickQueue[session.currentPickIndex]
      return (
        session.cart.totes.find((t) => t.slot === pick?.targetSlot)?.barcode ??
        ""
      )
    }
    default:
      return ""
  }
}

/**
 * Return a copy of the errors array with the most recent uncorrected error
 * marked as corrected.
 */
function markActiveErrorCorrected(
  errors: SimulationError[]
): SimulationError[] {
  let marked = false
  return [...errors].reverse().map((e) => {
    if (!marked && !e.corrected) {
      marked = true
      return { ...e, corrected: true }
    }
    return e
  }).reverse()
}

function noTransitionResult(
  session: SimulationSession,
  feedback: string
): { session: SimulationSession; result: EngineResult } {
  return {
    session,
    result: {
      success: false,
      newStep: session.currentStep,
      feedback,
    },
  }
}

/**
 * Build a user-facing coaching message for a scan error.
 * Per SIMULATION.md §Error Recovery Flows
 */
function buildErrorFeedback(result: ScanResult, step: WorkflowStep): string {
  switch (result) {
    case ScanResult.WRONG_ITEM:
      return step === WorkflowStep.PK_SCAN_ITEM_UPC
        ? "Wrong item scanned — verify the item at the Pick Front matches the RF Device"
        : "Incorrect barcode — check and retry"
    case ScanResult.WRONG_TOTE:
      return "Wrong tote scanned — verify the tote barcode matches the slot shown on RF Device (CTRL+W to go back)"
    case ScanResult.WRONG_LOCATION:
      return "Incorrect location — press CTRL+W and verify the physical location matches RF Device"
    case ScanResult.TOTE_ALLOCATED:
      return "Tote already allocated — set this tote aside and contact your Lead"
    case ScanResult.CART_ALLOCATED:
      return "Pick Cart Already Created — set this cart aside and contact your Lead"
    case ScanResult.ITEM_NOT_FOUND:
      return "Short inventory — verify the physical location, then notify your Lead"
    case ScanResult.ITEM_DAMAGED:
      return "Damaged item — place in Amnesty Bin (ziplock bag first if leaking)"
    case ScanResult.TIMEOUT:
      return "Scan timed out — try scanning again"
    default:
      return "Unexpected error — try again or contact your Lead"
  }
}

/** Generate a prefixed pseudo-unique ID for simulation objects. */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// Re-export types that tests/consumers need from this module
export type { InjectedError }
