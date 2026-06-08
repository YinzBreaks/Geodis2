/**
 * transitions.ts — WorkflowStep state transition map
 *
 * Every WorkflowStep declares its valid successor steps and the guard
 * conditions that must pass before the transition is allowed.
 *
 * Per SIMULATION.md §State Machine / §State Transition Map
 * Per BBWD-WI-030 §5.1 (Build Cart) and §5.2 (Pick)
 */

import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
  type EngineAction,
} from "@/types/domain"

/** Constants */
const MAX_TOTES_PER_CART = 9 // Per BBWD-WI-030 §5.1: always 9 totes

// ─────────────────────────────────────────────────────────────────────────────
// GUARD FUNCTION TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A guard evaluates whether a transition is permitted given the current session
 * and the action being attempted. Returns null on pass, or an error message on fail.
 */
type Guard = (
  session: SimulationSession,
  action: EngineAction
) => string | null

// ─────────────────────────────────────────────────────────────────────────────
// GUARD IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Always permits — placeholder guard for steps with no restrictions. */
const alwaysAllow: Guard = () => null

/**
 * BC_LOGIN_RF requires a non-empty User ID to be typed.
 * Any non-empty value advances — we are training the habit, not validating real creds.
 * Per BBWD-WI-030 §5.1.5
 */
const guardNonEmptyLogin: Guard = (_session, action) => {
  if (action.type === "TYPE" && !action.text.trim()) {
    return "Please enter your User ID"
  }
  return null
}

/**
 * CTRL+E is only valid when all 9 tote slots have been scanned.
 * Per SIMULATION.md §Sequence Enforcement and BBWD-WI-030 §5.1.15
 */
const guardCtrlE: Guard = (session) => {
  const scannedCount = session.cart.totes.filter(
    (t) => t.barcode.length > 0
  ).length
  if (scannedCount < MAX_TOTES_PER_CART) {
    return `Please scan all tote slots first (${scannedCount}/${MAX_TOTES_PER_CART} scanned)`
  }
  return null
}

/**
 * CTRL+A is only valid when "End Of Tote" is currently displayed.
 * Per SIMULATION.md §Sequence Enforcement and BBWD-WI-030 §5.2.15
 */
const guardCtrlA: Guard = (session) => {
  if (session.currentStep !== WorkflowStep.PK_END_OF_TOTE_DISPLAY) {
    return "No tote completion pending — End Of Tote must be displayed first"
  }
  return null
}

/** Guard: must be at PK_SCAN_ITEM_UPC step to scan an item barcode. */
const guardScanItem: Guard = (session) => {
  if (session.currentStep !== WorkflowStep.PK_SCAN_ITEM_UPC) {
    return "Complete previous step first — item scan not expected at this stage"
  }
  return null
}

/** Guard: quantity entry requires item to have been scanned first. */
const guardEnterQuantity: Guard = (session) => {
  if (session.currentStep !== WorkflowStep.PK_ENTER_QUANTITY) {
    return "Scan item barcode first before entering quantity"
  }
  return null
}

/** Guard: tote scan requires quantity to have been entered first. */
const guardScanTote: Guard = (session) => {
  if (session.currentStep !== WorkflowStep.PK_SCAN_TOTE_BARCODE) {
    return "Enter quantity first before scanning tote"
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single transition from one WorkflowStep to another.
 */
export interface Transition {
  /** The action type that triggers this transition. */
  actionType: EngineAction["type"]
  /** For KEY_PRESS actions: the key combination expected (e.g. "CTRL+E"). */
  expectedKeys?: string
  /** For TYPE actions: the text value expected (e.g. "1"). */
  expectedText?: string
  /** The step to advance to if the guard passes and the scan succeeds. */
  nextStep: WorkflowStep
  /** Guard that must pass before the transition fires. */
  guard: Guard
}

/**
 * The complete state transition map.
 * Maps each WorkflowStep to its valid outgoing transitions.
 *
 * Build Cart flow: BC_LOGIN_RF → … → BC_PRESS_CTRL_E
 * Pick flow:       PK_LOGIN_RF → … → PS_ROUND_COMPLETE (or loops)
 *
 * Per SIMULATION.md §State Machine §State Transition Map
 */
export const TRANSITIONS: Readonly<
  Partial<Record<WorkflowStep, Transition[]>>
> = {
  // ── BUILD CART PHASE ─────────────────────────────────────────────────────

  // Per BBWD-WI-030 §5.1.1 — Travel to Command Center (physical)
  [WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_RECEIVE_TOTE_COUNT,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.2 — Receive tote count from Tasker/CSR
  [WorkflowStep.BC_RECEIVE_TOTE_COUNT]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_OBTAIN_CART,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.3 — Obtain a Pick Cart
  [WorkflowStep.BC_OBTAIN_CART]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_LOAD_TOTES,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.3 — Load pick totes onto the cart
  [WorkflowStep.BC_LOAD_TOTES]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_LOGIN_RF,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.5 — type User ID into RF Device login screen
  // Any non-empty string advances — teaches login habit without validating real creds.
  [WorkflowStep.BC_LOGIN_RF]: [
    {
      actionType: "TYPE",
      nextStep: WorkflowStep.BC_SELECT_BBWD,
      guard: guardNonEmptyLogin,
    },
  ],

  // Per BBWD-WI-030 §5.1.6 — Type "1" for BBWD → Enter
  [WorkflowStep.BC_SELECT_BBWD]: [
    {
      actionType: "TYPE",
      expectedText: "1",
      nextStep: WorkflowStep.BC_SELECT_OUTBOUND,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.7 — Type "2" for Outbound Phase II → Enter
  [WorkflowStep.BC_SELECT_OUTBOUND]: [
    {
      actionType: "TYPE",
      expectedText: "2",
      nextStep: WorkflowStep.BC_PRESS_CTRL_T,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.8 — Press CTRL+T to change Task Group
  [WorkflowStep.BC_PRESS_CTRL_T]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+T",
      nextStep: WorkflowStep.BC_CONFIRM_TASK_GROUP,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.8 — Press Enter twice to confirm Task Group
  [WorkflowStep.BC_CONFIRM_TASK_GROUP]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "ENTER+ENTER",
      nextStep: WorkflowStep.BC_SCAN_ZONE_TASK_GROUP,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.9 — Scan zone or FEX barcode
  [WorkflowStep.BC_SCAN_ZONE_TASK_GROUP]: [
    {
      actionType: "SCAN",
      nextStep: WorkflowStep.BC_SELECT_MAKE_TOTE_CART,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.10 — [US only] Type "1" for Make Tote Cart BB → Enter
  [WorkflowStep.BC_SELECT_MAKE_TOTE_CART]: [
    {
      actionType: "TYPE",
      expectedText: "1",
      nextStep: WorkflowStep.BC_SCAN_CART_BARCODE,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.11 — Scan the Pick Cart barcode
  [WorkflowStep.BC_SCAN_CART_BARCODE]: [
    {
      actionType: "SCAN",
      nextStep: WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.12 — Place tote in slot (physical confirmation)
  [WorkflowStep.BC_PLACE_TOTE_IN_SLOT]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_SCAN_TOTE_BARCODE,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.1.12–13 — Scan each tote barcode × 9
  // After last tote (slot 9), stays here until CTRL+E advances to BC_PRESS_CTRL_E
  [WorkflowStep.BC_SCAN_TOTE_BARCODE]: [
    {
      actionType: "SCAN",
      // nextStep is determined dynamically in the engine based on slot count:
      // slot < 9 → BC_PLACE_TOTE_IN_SLOT (next slot)
      // slot === 9 → remains at BC_SCAN_TOTE_BARCODE until CTRL+E
      nextStep: WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
      guard: alwaysAllow,
    },
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+E",
      nextStep: WorkflowStep.BC_PRESS_CTRL_E,
      // Per SIMULATION.md §Sequence Enforcement: blocked if not all 9 scanned
      guard: guardCtrlE,
    },
  ],

  // Per BBWD-WI-030 §5.1.15 — CTRL+E finalizes cart; transitions to Pick Phase
  // KEY_PRESS CTRL+E: soft key dispatched from BC_PRESS_CTRL_E finalize screen
  // CONFIRM: fallback for screen-level Continue button
  [WorkflowStep.BC_PRESS_CTRL_E]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+E",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // ── PICK PHASE ───────────────────────────────────────────────────────────

  // Per BBWD-WI-030 §5.2.1 — Pick up the cart (physical)
  [WorkflowStep.PK_PICKUP_CART]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_LOGIN_RF,
      guard: alwaysAllow,
    },
  ],

  // STANDALONE PICK MODE — not yet wired into the main training flow.
  // PK_LOGIN_RF is reachable only from PK_PICKUP_CART (above).
  // These three steps mirror BC_LOGIN_RF/BC_SELECT_BBWD/BC_SELECT_OUTBOUND
  // for the pick-phase login sequence. Screens are generated by screen-generator.ts.
  // Per BBWD-WI-030 §5.2.2–4 — RF login + menu navigation
  // In Pick Phase, login/menu steps parallel the Build Cart flow
  [WorkflowStep.PK_LOGIN_RF]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_SELECT_BBWD,
      guard: alwaysAllow,
    },
  ],

  [WorkflowStep.PK_SELECT_BBWD]: [
    {
      actionType: "TYPE",
      expectedText: "1",
      nextStep: WorkflowStep.PK_SELECT_OUTBOUND,
      guard: alwaysAllow,
    },
  ],

  [WorkflowStep.PK_SELECT_OUTBOUND]: [
    {
      actionType: "TYPE",
      expectedText: "2",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.5 — RF Device auto-displays the first pick
  [WorkflowStep.PK_READ_PICK_DISPLAY]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_TRAVEL_TO_LOCATION,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.6 — Travel to Pick Front (physical — must be confirmed)
  [WorkflowStep.PK_TRAVEL_TO_LOCATION]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_VERIFY_LOCATION,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.7 — Verify physical location matches RF Device
  [WorkflowStep.PK_VERIFY_LOCATION]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_VERIFY_ITEM,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.8 — Verify the item
  [WorkflowStep.PK_VERIFY_ITEM]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.9 — Scan item UPC barcode
  [WorkflowStep.PK_SCAN_ITEM_UPC]: [
    {
      actionType: "SCAN",
      nextStep: WorkflowStep.PK_PICK_QUANTITY,
      guard: guardScanItem,
    },
  ],

  // Per BBWD-WI-030 §5.2.10 — Pick the quantity shown (physical)
  [WorkflowStep.PK_PICK_QUANTITY]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_PLACE_IN_TOTE,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.11 — Place item(s) in tote (physical)
  [WorkflowStep.PK_PLACE_IN_TOTE]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_ENTER_QUANTITY,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.12 — Enter quantity picked → Enter
  [WorkflowStep.PK_ENTER_QUANTITY]: [
    {
      actionType: "TYPE",
      nextStep: WorkflowStep.PK_SCAN_TOTE_BARCODE,
      guard: guardEnterQuantity,
    },
  ],

  // Per BBWD-WI-030 §5.2.13 — Scan the Pick Tote barcode shown on RF Device
  // After success: engine checks if more picks remain or if End Of Tote
  [WorkflowStep.PK_SCAN_TOTE_BARCODE]: [
    {
      actionType: "SCAN",
      // nextStep is dynamic in engine: PK_READ_PICK_DISPLAY or PK_END_OF_TOTE_DISPLAY
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: guardScanTote,
    },
  ],

  // Per BBWD-WI-030 §5.2.14 — "End Of Tote" screen auto-displays
  [WorkflowStep.PK_END_OF_TOTE_DISPLAY]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+A",
      nextStep: WorkflowStep.PK_PRESS_CTRL_A,
      // Per SIMULATION.md §Sequence Enforcement: blocked if not at End Of Tote
      guard: guardCtrlA,
    },
  ],

  // Per BBWD-WI-030 §5.2.15 — CTRL+A confirms tote complete
  [WorkflowStep.PK_PRESS_CTRL_A]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.16 — Place completed tote on nearest conveyor (Putwall)
  [WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR]: [
    {
      actionType: "CONFIRM",
      // nextStep is dynamic in engine: PS_CONTINUE_NEXT_TOTE or PS_ROUND_COMPLETE
      nextStep: WorkflowStep.PS_CONTINUE_NEXT_TOTE,
      guard: alwaysAllow,
    },
  ],

  // ── PICK STAGE (wrap-up) ─────────────────────────────────────────────────

  [WorkflowStep.PS_CONTINUE_NEXT_TOTE]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2.18 — Complete all trash pickup throughout process
  [WorkflowStep.PS_TRASH_PICKUP]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PS_ROUND_COMPLETE,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2 — Last item in box handling
  [WorkflowStep.PS_LAST_ITEM_IN_BOX]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // Per BBWD-WI-030 §5.2 — Last item on pallet handling
  [WorkflowStep.PS_LAST_ITEM_ON_PALLET]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  [WorkflowStep.PS_ROUND_COMPLETE]: [
    // Terminal state — no outgoing transitions
  ],

  // ── EXCEPTION HANDLING ───────────────────────────────────────────────────
  // Per BBWD-WI-030 §6

  // §6.5.1 — Wrong item, last at location.
  // CONFIRM acknowledges the error display → Notify Lead.
  // CTRL+K also accepted here — the screen displays "Press CTRL+K to skip".
  // Dynamic CTRL+K routing in handleKeyPress sends WRONG_ITEM errors to
  // PK_PLACE_TOTE_ON_CONVEYOR. Per BBWD-WI-030 §6.5.1.
  [WorkflowStep.EX_INVALID_ITEM_LAST]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.EX_NOTIFY_LEAD,
      guard: alwaysAllow,
    },
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+K",
      // nextStep is overridden dynamically in engine: WRONG_ITEM → PK_PLACE_TOTE_ON_CONVEYOR
      nextStep: WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
      guard: alwaysAllow,
    },
  ],

  // §6.5.2 — Wrong item, not last at location. Confirm to acknowledge → Notify Lead
  [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.EX_NOTIFY_LEAD,
      guard: alwaysAllow,
    },
  ],

  // §6.6 — Short inventory. Confirm (verify location) → Notify Lead
  [WorkflowStep.EX_SHORT_INVENTORY]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.EX_NOTIFY_LEAD,
      guard: alwaysAllow,
    },
  ],

  // §6.7 — Damaged item. Confirm to acknowledge → proceed to Amnesty Bin
  [WorkflowStep.EX_DAMAGED_ITEM]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.EX_ITEM_TO_AMNESTY_BIN,
      guard: alwaysAllow,
    },
  ],

  // §6.3/§6.4 — Incorrect location or press-CTRL+W screen: press CTRL+W → re-verify
  [WorkflowStep.EX_INCORRECT_LOCATION]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+W",
      nextStep: WorkflowStep.PK_VERIFY_LOCATION,
      guard: alwaysAllow,
    },
  ],

  // §6.3 — Incorrect tote: press CTRL+W → re-verify location
  [WorkflowStep.EX_INCORRECT_TOTE]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+W",
      nextStep: WorkflowStep.PK_VERIFY_LOCATION,
      guard: alwaysAllow,
    },
  ],

  // §6.1 — Tote already allocated: confirm (set aside, wait for lead)
  [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_SCAN_TOTE_BARCODE,
      guard: alwaysAllow,
    },
  ],

  // §6.2 — Cart already created: confirm (set aside, wait for lead)
  [WorkflowStep.EX_CART_ALREADY_CREATED]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.BC_SCAN_CART_BARCODE,
      guard: alwaysAllow,
    },
  ],

  // WRONG_LOCATION / WRONG_TOTE recovery: CTRL+W → re-verify → re-scan
  [WorkflowStep.EX_PRESS_CTRL_W]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+W",
      nextStep: WorkflowStep.PK_VERIFY_LOCATION,
      guard: alwaysAllow,
    },
  ],

  // Skip a pick — exception handling only (CTRL+K)
  // nextStep here is overridden dynamically in the engine based on active error type.
  // WRONG_ITEM → PK_PLACE_TOTE_ON_CONVEYOR; ITEM_NOT_FOUND → PK_READ_PICK_DISPLAY
  [WorkflowStep.EX_PRESS_CTRL_K]: [
    {
      actionType: "KEY_PRESS",
      expectedKeys: "CTRL+K",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // Notify Lead — required before most exception resolutions
  [WorkflowStep.EX_NOTIFY_LEAD]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.EX_PRESS_CTRL_K,
      guard: alwaysAllow,
    },
  ],

  // Item to Amnesty Bin — WRONG_ITEM (last item) or DAMAGED_ITEM resolution
  // Engine intercepts to mark the active error as corrected before advancing.
  [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],

  // Item to IC (Inventory Control) — WRONG_ITEM (not last) resolution
  // Engine intercepts to mark the active error as corrected before advancing.
  [WorkflowStep.EX_ITEM_TO_IC]: [
    {
      actionType: "CONFIRM",
      nextStep: WorkflowStep.PK_READ_PICK_DISPLAY,
      guard: alwaysAllow,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION LOOKUP HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find all transitions from a given WorkflowStep.
 */
export function getTransitions(step: WorkflowStep): Transition[] {
  return TRANSITIONS[step] ?? []
}

/**
 * Find the matching transition for a given step + action combination.
 * Returns undefined if no matching transition exists (invalid action for step).
 */
export function findTransition(
  step: WorkflowStep,
  action: EngineAction
): Transition | undefined {
  const candidates = getTransitions(step)
  return candidates.find((t) => {
    if (t.actionType !== action.type) return false
    if (
      t.actionType === "KEY_PRESS" &&
      action.type === "KEY_PRESS" &&
      t.expectedKeys !== undefined
    ) {
      return t.expectedKeys === action.keys
    }
    if (
      t.actionType === "TYPE" &&
      action.type === "TYPE" &&
      t.expectedText !== undefined
    ) {
      return t.expectedText === action.text
    }
    return true
  })
}

/** Mapping from ScanResult error to the first exception WorkflowStep for that error type. */
export const ERROR_ENTRY_STEPS: Readonly<Partial<Record<ScanResult, WorkflowStep>>> = {
  [ScanResult.WRONG_ITEM]: WorkflowStep.EX_INVALID_ITEM_LAST,
  [ScanResult.WRONG_TOTE]: WorkflowStep.EX_INCORRECT_TOTE,
  [ScanResult.WRONG_LOCATION]: WorkflowStep.EX_INCORRECT_LOCATION,
  [ScanResult.TOTE_ALLOCATED]: WorkflowStep.EX_TOTE_ALREADY_ALLOCATED,
  [ScanResult.CART_ALLOCATED]: WorkflowStep.EX_CART_ALREADY_CREATED,
  [ScanResult.ITEM_NOT_FOUND]: WorkflowStep.EX_SHORT_INVENTORY,
  [ScanResult.ITEM_DAMAGED]: WorkflowStep.EX_DAMAGED_ITEM,
  // ScanResult.TIMEOUT is intentionally omitted — no WorkflowStep transition.
  // A timeout means the scanner received no input within the allowed window;
  // the engine shows an inline "Scan timed out — try again" retry prompt
  // and stays on the current step. No error is logged to session.errors.
}
