/**
 * process-input.ts — Canonical input pipeline for the simulation engine
 *
 * EVERY interaction entry point (scan gun, keyboard, click/tap target) routes
 * through processInput(). The engine owns all validation and transitions —
 * the UI only constructs a CanonicalInput and renders the result.
 *
 * Click and scanner paths are behaviorally identical: a click target carries
 * the same canonical value (barcode/keys/quantity) a physical scan would emit.
 */

import { WorkflowStep, type EngineAction, type SimulationSession, type SimulationScenario, type EngineResult } from "@/types/domain"
import { dispatch } from "@/engine/simulation-engine"

/** Where the input physically originated. Behavior is source-independent. */
export type InputSource = "scanner" | "keyboard" | "click"

export type CanonicalInputType = "SCAN" | "CONFIRM" | "QUANTITY" | "SOFTKEY"

/**
 * The single canonical input contract.
 *  - SCAN     value = barcode (cart, tote, item UPC, location, zone)
 *  - CONFIRM  value ignored — confirms the current physical step
 *  - QUANTITY value = numeric text entry (quantity picked, menu selection)
 *  - SOFTKEY  value = key combo ("CTRL+E", "CTRL+A", … or "ENTER")
 */
export interface CanonicalInput {
  type: CanonicalInputType
  value: string
  source: InputSource
}

/**
 * Steps where the ENTER soft key maps to a specific key combo rather than a
 * generic CONFIRM. Per BBWD-WI-030 §5.1.8 (CTRL+T / ENTER+ENTER) and
 * §5.2.14 (CTRL+A confirms End Of Tote).
 */
const ENTER_KEY_OVERRIDES: Partial<Record<WorkflowStep, string>> = {
  [WorkflowStep.BC_PRESS_CTRL_T]: "CTRL+T",
  [WorkflowStep.BC_CONFIRM_TASK_GROUP]: "ENTER+ENTER",
  [WorkflowStep.PK_END_OF_TOTE_DISPLAY]: "CTRL+A",
}

/** Translate a CanonicalInput into the engine's internal EngineAction. */
export function toEngineAction(
  input: CanonicalInput,
  currentStep: WorkflowStep
): EngineAction {
  switch (input.type) {
    case "SCAN":
      return { type: "SCAN", value: input.value }
    case "QUANTITY":
      return { type: "TYPE", text: input.value }
    case "SOFTKEY": {
      if (input.value === "ENTER") {
        const keys = ENTER_KEY_OVERRIDES[currentStep]
        if (keys) return { type: "KEY_PRESS", keys }
        return { type: "CONFIRM", step: currentStep }
      }
      return { type: "KEY_PRESS", keys: input.value }
    }
    case "CONFIRM":
      return { type: "CONFIRM", step: currentStep }
  }
}

/**
 * The ONLY public entry point for user interactions.
 * Validation and transitions are fully owned by dispatch() and its
 * validators/transitions — never by callers.
 */
export function processInput(
  session: SimulationSession,
  input: CanonicalInput,
  scenario?: SimulationScenario
): { session: SimulationSession; result: EngineResult } {
  return dispatch(session, toEngineAction(input, session.currentStep), scenario)
}
