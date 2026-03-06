/**
 * useSimulation — Zustand store for simulation state
 *
 * Wraps the pure simulation engine in a React-compatible store.
 * The store is the ONLY bridge between the engine and React components.
 *
 * Per CLAUDE.md §Architecture: simulation state lives in engine + Zustand only.
 */

import { create } from "zustand"
import {
  dispatch,
  startSessionWithTasks,
  getCurrentScreen,
  calculateScore,
} from "@/engine/simulation-engine"
import { SCENARIO_DATA } from "@/data/seedData"
import {
  WorkflowStep,
  type SimulationSession,
  type SimulationScenario,
  type EngineAction,
  type EngineResult,
  type RFDeviceScreen,
  type SessionScore,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// INPUT MODE UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The UI action mode derived from the current session state.
 * Determines which input widget to render on the RF Device component.
 *
 * - SCAN: show text input; submit dispatches { type: "SCAN" }
 * - TYPE: show text input; submit dispatches { type: "TYPE" }
 * - CONFIRM: show Continue button; submit dispatches { type: "CONFIRM" }
 */
export type InputMode = "SCAN" | "TYPE" | "CONFIRM"

/**
 * Steps where the screen shows a barcode/text field but the engine expects
 * a physical CONFIRM first (travel, place item, verify) before the scan step.
 *
 * These steps have CONFIRM transitions even though the screen generator shows
 * BARCODE inputType (because the real RF device cursor is already at the scan
 * field while the picker physically completes the prior action).
 */
const CONFIRM_BEFORE_SCAN_STEPS = new Set<WorkflowStep>([
  WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
  WorkflowStep.PK_READ_PICK_DISPLAY,
  WorkflowStep.PK_TRAVEL_TO_LOCATION,
  WorkflowStep.PK_VERIFY_LOCATION,
  WorkflowStep.PK_VERIFY_ITEM,
])

/**
 * Derive the UI input mode from the current workflow step and screen inputType.
 *
 * Components call this to decide whether to render an input field or a
 * confirmation button. Must stay in sync with engine transition definitions.
 */
export function getInputMode(
  step: WorkflowStep,
  inputType: RFDeviceScreen["inputType"]
): InputMode {
  if (CONFIRM_BEFORE_SCAN_STEPS.has(step)) return "CONFIRM"
  switch (inputType) {
    case "BARCODE":
      return "SCAN"
    case "NUMERIC":
      return "TYPE"
    default:
      return "CONFIRM"
  }
}

/**
 * Determine the correct EngineAction to fire when the ENTER soft key is pressed.
 *
 * BC_CONFIRM_TASK_GROUP requires two Enter presses (ENTER+ENTER per SOP §5.1.8).
 * All other steps treat ENTER as a physical CONFIRM.
 */
export function getEnterKeyAction(step: WorkflowStep): EngineAction {
  if (step === WorkflowStep.BC_CONFIRM_TASK_GROUP) {
    return { type: "KEY_PRESS", keys: "ENTER+ENTER" }
  }
  return { type: "CONFIRM", step }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────────────────────

interface SimulationState {
  session: SimulationSession | null
  scenario: SimulationScenario | null
  /** Last engine result — exposes feedback on error for the UI to display */
  result: EngineResult | null
  /** Final score — populated atomically when PS_ROUND_COMPLETE is reached */
  score: SessionScore | null

  startSimulation: (bundleKey: string) => void
  sendAction: (action: EngineAction) => void
  reset: () => void
}

export const useSimulation = create<SimulationState>((set, get) => ({
  session: null,
  scenario: null,
  result: null,
  score: null,

  startSimulation(bundleKey: string) {
    const bundle = SCENARIO_DATA[bundleKey]
    if (!bundle) return

    const session = startSessionWithTasks(
      "trainee-dev",
      bundle.scenario,
      bundle.pickQueue,
      bundle.cart
    )

    set({ session, scenario: bundle.scenario, result: null, score: null })
  },

  sendAction(action: EngineAction) {
    const { session, scenario } = get()
    if (!session) return

    const { session: newSession, result } = dispatch(
      session,
      action,
      scenario ?? undefined
    )

    // Calculate final score atomically when the round completes.
    // Per CLAUDE.md §Simulations: (accuracy × 0.6) + (speed × 0.4)
    const isComplete =
      newSession.currentStep === WorkflowStep.PS_ROUND_COMPLETE
    const score =
      isComplete && scenario
        ? calculateScore(newSession, scenario)
        : get().score

    set({ session: newSession, result, score })
  },

  reset() {
    set({ session: null, scenario: null, result: null, score: null })
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED SELECTORS
// ─────────────────────────────────────────────────────────────────────────────

/** Get the current RF Device screen for a session. Pure — no store access. */
export function selectScreen(session: SimulationSession): RFDeviceScreen {
  return getCurrentScreen(session)
}

/** True when the simulation has reached the terminal PS_ROUND_COMPLETE step. */
export function selectIsComplete(session: SimulationSession): boolean {
  return session.currentStep === WorkflowStep.PS_ROUND_COMPLETE
}
