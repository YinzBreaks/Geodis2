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
  startSessionWithTasks,
  getCurrentScreen,
  calculateScore,
} from "@/engine/simulation-engine"
import {
  processInput as engineProcessInput,
  type CanonicalInput,
} from "@/engine/process-input"
import { computeSessionResult } from "@/engine/scorer"
import { EXCEPTION_RESOLUTION } from "@/engine/error-injector"
import { SCENARIO_DATA, SEED_ITEMS } from "@/data/seedData"
import { COACHING_CONTENT } from "@/data/coachingContent"
import { ACTIVE_DEVICE_MODEL_ID } from "@/types/devices"
import {
  WorkflowStep,
  DifficultyLevel,
  ScanResult,
  type SimulationSession,
  type SimulationScenario,
  type EngineResult,
  type RFDeviceScreen,
  type SessionScore,
  type SessionResult,
  type WarehouseItem,
  type ErrorScenario,
} from "@/types/domain"
import type { CoachingState } from "@/types/coaching"

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

// ─────────────────────────────────────────────────────────────────────────────
// SOFT KEY ENABLE / DISABLE LOGIC
// Per CLAUDE.md §RF Device Configuration: 5 soft keys, disabled when not valid
// ─────────────────────────────────────────────────────────────────────────────

/** Keys shown on the TC520K soft key bar. */
export const SOFT_KEY_IDS = [
  "CTRL+T",
  "CTRL+E",
  "CTRL+A",
  "CTRL+W",
  "CTRL+K",
] as const

export type SoftKeyId = (typeof SOFT_KEY_IDS)[number]

/**
 * Determine which soft keys are enabled at the current workflow step.
 *
 * Rules from CLAUDE.md §Canonical Domain Vocabulary + §Workflow Reference:
 *   CTRL+T — enabled at BC_PRESS_CTRL_T
 *   CTRL+E — enabled at BC_SCAN_TOTE_BARCODE when all 9 totes have been scanned
 *             (tote.barcode.length > 0 for every slot)
 *   CTRL+A — enabled at PK_END_OF_TOTE_DISPLAY (press to confirm tote complete)
 *   CTRL+W — enabled at EX_PRESS_CTRL_W, EX_INCORRECT_LOCATION, EX_INCORRECT_TOTE
 *   CTRL+K — enabled at EX_PRESS_CTRL_K, EX_INVALID_ITEM_LAST
 *
 * Bug 4 fix: CTRL+E previously used `slot > 9` which is never true (slot caps at 9).
 * Now checks that all 9 totes have non-empty barcodes, which is set by
 * advanceAfterSuccessfulScan when each tote is scanned.
 * Bug 4b fix: CTRL+E is also enabled at BC_PRESS_CTRL_E (the finalize screen shown
 * after slot 9 scan) so the soft key remains active on that screen.
 */
const MAX_TOTES_PER_CART = 9 // Per BBWD-WI-030 §5.1: always 9 totes per cart

export function getSoftKeyEnabled(
  session: SimulationSession
): Record<SoftKeyId, boolean> {
  const step = session.currentStep
  const allTotesScanned =
    session.currentToteSlot > MAX_TOTES_PER_CART ||
    session.cart.totes.filter((t) => t.barcode.length > 0).length >= MAX_TOTES_PER_CART

  return {
    "CTRL+T": step === WorkflowStep.BC_PRESS_CTRL_T,
    "CTRL+E": (step === WorkflowStep.BC_SCAN_TOTE_BARCODE || step === WorkflowStep.BC_PRESS_CTRL_E) && allTotesScanned,
    "CTRL+A": step === WorkflowStep.PK_END_OF_TOTE_DISPLAY,
    "CTRL+W":
      step === WorkflowStep.EX_PRESS_CTRL_W ||
      step === WorkflowStep.EX_INCORRECT_LOCATION ||
      step === WorkflowStep.EX_INCORRECT_TOTE,
    "CTRL+K":
      step === WorkflowStep.EX_PRESS_CTRL_K ||
      step === WorkflowStep.EX_INVALID_ITEM_LAST,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT KEY PULSE LOGIC
// Per task spec: KEYBOARD_SHORTCUT inputType triggers pulse on matching button.
//   BEGINNER: always, INTERMEDIATE: first 3, ADVANCED: never
// ─────────────────────────────────────────────────────────────────────────────

const PULSE_LIMIT: Record<DifficultyLevel, number> = {
  [DifficultyLevel.BEGINNER]: Infinity,
  [DifficultyLevel.INTERMEDIATE]: 3,
  [DifficultyLevel.ADVANCED]: 0,
}

/**
 * Should the matching soft key button pulse (animate) right now?
 *
 * @param screen        current RF Device screen
 * @param difficulty    session difficulty level
 * @param pulseCount    how many pulses have already fired this session
 * @returns The SoftKeyId to pulse, or null
 */
export function shouldPulseSoftKey(
  screen: RFDeviceScreen,
  difficulty: DifficultyLevel,
  pulseCount: number
): SoftKeyId | null {
  if (screen.inputType !== "KEYBOARD_SHORTCUT") return null
  const key = screen.activeField as SoftKeyId | undefined
  if (!key) return null
  if (pulseCount >= PULSE_LIMIT[difficulty]) return null
  return key
}

// ─────────────────────────────────────────────────────────────────────────────
// DECOY ITEM GENERATION
// Per task spec: BEGINNER=0, INTERMEDIATE=1, ADVANCED=2 decoys.
// Selection deterministic via pickIndex for reproducibility.
// ─────────────────────────────────────────────────────────────────────────────

const DECOY_COUNT: Record<DifficultyLevel, number> = {
  [DifficultyLevel.BEGINNER]: 0,
  [DifficultyLevel.INTERMEDIATE]: 1,
  [DifficultyLevel.ADVANCED]: 2,
}

/**
 * Get decoy (distractor) items for the warehouse floor display during pick.
 * These are items that look similar but are NOT the correct pick item.
 *
 * @returns Array of decoy WarehouseItems (empty if BEGINNER or not picking)
 */
export function getDecoyItems(
  session: SimulationSession,
  difficulty: DifficultyLevel
): WarehouseItem[] {
  const count = DECOY_COUNT[difficulty]
  if (count === 0) return []

  const currentPick = session.pickQueue[session.currentPickIndex]
  if (!currentPick) return []

  const allItems = Object.values(SEED_ITEMS)
  const otherItems = allItems.filter(
    (item) => item.itemId !== currentPick.item.itemId
  )

  const decoys: WarehouseItem[] = []
  for (let i = 0; i < count && i < otherItems.length; i++) {
    // Deterministic selection seeded by pickIndex
    const index = (session.currentPickIndex + i + 1) % otherItems.length
    decoys.push(otherItems[index])
  }

  return decoys
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
  /**
   * Rich result computed at simulation completion — drives the results screen.
   * Includes band, feedback, duration, and exception stats.
   */
  sessionResult: SessionResult | null
  /** The SCENARIO_DATA bundle key (e.g. "Z1_10_PICKS") for the active session. */
  scenarioKey: string | null
  /** Tracks async DB persistence lifecycle. */
  saveStatus: "idle" | "saving" | "saved" | "failed"
  /** Non-null when saveStatus === "failed". */
  saveError: string | null
  /** DB id of the persisted SimSession record once saved. */
  savedSessionId: string | null
  /** How many soft-key pulse hints have been shown this session */
  softKeyPulseCount: number
  /**
   * Count of successful actions taken in the current session.
   * Increments on every correct scan, keypress, or confirmation.
   * Drives the StepProgressBar current-step indicator.
   */
  actionCount: number
  /**
   * Estimated total number of action steps in the current scenario.
   * Computed at scenario start — approximate because error injection can add steps.
   * Formula: 26 (build cart) + pickCount × 7 (pick actions) + ceil(pickCount/9) × 2 (end-of-tote).
   */
  estimatedTotalSteps: number
  /**
   * Currently active device model ID — drives emulator visual style.
   * Updated by DeviceSelector at runtime without altering ACTIVE_DEVICE_MODEL_ID.
   */
  activeDeviceModelId: string
  /**
   * Per-step coaching state — only populated in BEGINNER mode.
   * CoachingPanel reads this to decide what to show.
   */
  coaching: CoachingState
  /**
   * Last action result for driving scan/error animations.
   * 'correct' triggers scanBeam + successPulse, 'error' triggers errorShake.
   * Reset to null after 600ms.
   */
  lastActionResult: "correct" | "error" | null

  startSimulation: (bundleKey: string) => void
  /**
   * Canonical input pipeline — the ONLY way UI sends user interactions.
   * Routes through the engine's processInput contract.
   */
  processInput: (input: CanonicalInput) => void
  /** Persist the completed session to the database. Safe to call multiple times — no-ops if already saving/saved. */
  persistSession: () => Promise<void>
  /** Increment the pulse counter (called by soft key bar on animation start) */
  recordPulse: () => void
  /** Switch the emulator to a different device model at runtime. */
  setActiveDevice: (modelId: string) => void
  /**
   * Inject an exception (Overhaul 4 / Phase 11) that fires on the trainee's
   * next scan at the current pick index. Appends an ErrorScenario to the live
   * scenario — the pure engine reads scenario.errorScenarios unchanged.
   */
  injectException: (errorType: ScanResult, isLastItemAtLocation?: boolean) => void
  reset: () => void
}

/** Empty coaching state — used for INTERMEDIATE/ADVANCED or before session starts. */
const COACHING_HIDDEN: CoachingState = {
  isVisible: false,
  content: null,
  step: null,
}

/**
 * Derive coaching state for the given step and difficulty.
 * Returns visible coaching if BEGINNER and content exists; hidden otherwise.
 */
function resolveCoaching(
  step: WorkflowStep,
  difficulty: DifficultyLevel
): CoachingState {
  if (difficulty !== DifficultyLevel.BEGINNER) return COACHING_HIDDEN
  const content = COACHING_CONTENT[step] ?? null
  if (!content) return { isVisible: false, content: null, step }
  return { isVisible: true, content, step }
}

export const useSimulation = create<SimulationState>((set, get) => ({
  session: null,
  scenario: null,
  result: null,
  score: null,
  sessionResult: null,
  scenarioKey: null,
  saveStatus: "idle",
  saveError: null,
  savedSessionId: null,
  softKeyPulseCount: 0,
  actionCount: 0,
  estimatedTotalSteps: 0,
  activeDeviceModelId: ACTIVE_DEVICE_MODEL_ID,
  coaching: COACHING_HIDDEN,
  lastActionResult: null,

  startSimulation(bundleKey: string) {
    const bundle = SCENARIO_DATA[bundleKey]
    if (!bundle) return

    const session = startSessionWithTasks(
      "trainee-dev",
      bundle.scenario,
      bundle.pickQueue,
      bundle.cart
    )

    // Estimate total steps for the progress bar.
    // Build cart ≈ 26 steps + 7 actions per pick + 2 end-of-tote steps per 9 picks.
    const pickCount = bundle.pickQueue.length
    const estimatedTotalSteps = 26 + pickCount * 7 + Math.ceil(pickCount / 9) * 2

    set({
      session,
      scenario: bundle.scenario,
      result: null,
      score: null,
      sessionResult: null,
      scenarioKey: bundleKey,
      saveStatus: "idle",
      saveError: null,
      savedSessionId: null,
      softKeyPulseCount: 0,
      actionCount: 0,
      estimatedTotalSteps,
      coaching: resolveCoaching(session.currentStep, session.difficulty),
    })

    // Initialize server-tracked session in background
    if (typeof window !== "undefined") {
      fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: bundle.scenario.moduleId,
          difficulty: bundle.scenario.difficulty,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return null
          return (await res.json()) as { sessionId: string; startedAt: string }
        })
        .then((data) => {
          if (data) {
            set((state) => {
              if (!state.session) return state
              return {
                session: {
                  ...state.session,
                  sessionId: data.sessionId,
                  startedAt: new Date(data.startedAt),
                },
              }
            })
          }
        })
        .catch(() => {
          // Gracefully fallback to client-generated session ID (offline / dev)
        })
    }
  },

  processInput(input: CanonicalInput) {
    const { session, scenario } = get()
    if (!session) return

    const { session: nextSession, result } = engineProcessInput(
      session,
      input,
      scenario ?? undefined
    )

    // Calculate final score atomically when the round completes.
    // Per CLAUDE.md §Simulations: (accuracy × 0.6) + (speed × 0.4)
    const isComplete =
      nextSession.currentStep === WorkflowStep.PS_ROUND_COMPLETE
    const completedAt = isComplete ? new Date() : undefined
    const newSession = completedAt
      ? {
          ...nextSession,
          completedAt,
          totalTimeMs: completedAt.getTime() - nextSession.startedAt.getTime(),
          status: "COMPLETED" as const,
        }
      : nextSession
    const score =
      isComplete && scenario
        ? calculateScore(newSession, scenario)
        : get().score

    // Compute rich SessionResult on completion (drives results screen)
    const sessionResult =
      isComplete && scenario
        ? computeSessionResult(newSession, scenario)
        : get().sessionResult

    // Update coaching:
    //   success + step changed → resolve coaching for the new step
    //   success + same step   → dismiss (shouldn’t happen, but guard anyway)
    //   failure               → keep coaching visible (trainee needs it most when wrong)
    let coaching: CoachingState = get().coaching
    if (result.success) {
      coaching = resolveCoaching(newSession.currentStep, newSession.difficulty)
    }
    // On failure: coaching stays as-is

    set({ session: newSession, result, score, sessionResult, coaching })

    // Increment action counter on every successful step (drives StepProgressBar).
    if (result.success) {
      set((state) => ({ actionCount: state.actionCount + 1 }))
    }

    // Drive scan/error animations: set lastActionResult, auto-clear after 600ms
    const actionResult = result.success ? "correct" as const : "error" as const
    set({ lastActionResult: actionResult })
    setTimeout(() => {
      // Only clear if it hasn't been overwritten by a newer action
      if (get().lastActionResult === actionResult) {
        set({ lastActionResult: null })
      }
    }, 600)
  },

  async persistSession() {
    const { sessionResult, scenarioKey, saveStatus, session } = get()
    // Only fire once per simulation, and only when we have the data
    if (saveStatus !== "idle" || !sessionResult || !scenarioKey || !session) return

    set({ saveStatus: "saving" })

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          scenarioId: session.moduleId,
          difficulty: sessionResult.difficulty,
          finalScore: sessionResult.finalScore,
          accuracyScore: sessionResult.accuracyScore,
          speedScore: sessionResult.speedScore,
          passed: sessionResult.passed,
          totalPicks: sessionResult.totalPicks,
          correctFirstScans: sessionResult.correctFirstScans,
          errorCount: sessionResult.errorCount,
          durationSeconds: sessionResult.durationSeconds,
          totalTimeMs: session.totalTimeMs,
          errorsEncountered: sessionResult.errorsEncountered,
          exceptionsResolved: sessionResult.exceptionsResolved,
          scanEvents: session.scanEvents,
          errors: session.errors,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }

      const data = (await res.json()) as { sessionId: string }
      set({ saveStatus: "saved", savedSessionId: data.sessionId })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      set({
        saveStatus: "failed",
        saveError: `Session not saved — ${message}. You may not be logged in.`,
      })
    }
  },

  recordPulse() {
    set((state) => ({ softKeyPulseCount: state.softKeyPulseCount + 1 }))
  },

  setActiveDevice(modelId: string) {
    set({ activeDeviceModelId: modelId })
  },

  injectException(errorType: ScanResult, isLastItemAtLocation = true) {
    const { session, scenario } = get()
    if (!session || !scenario) return

    const pickIndex = session.currentPickIndex

    // Skip if an injection is already queued/fired at this pick index.
    const alreadyQueued = scenario.errorScenarios.some(
      (e) => e.injectAtPickIndex === pickIndex && e.errorType === errorType
    )
    if (alreadyQueued) return

    const injected: ErrorScenario = {
      scenarioId: `inject-${Date.now()}`,
      injectAtPickIndex: pickIndex,
      errorType,
      description: `Supervisor-injected ${errorType} at pick ${pickIndex + 1}`,
      expectedResolution: EXCEPTION_RESOLUTION[errorType] ?? [],
      sopReference: "BBWD-WI-030 §6",
      isLastItemAtLocation,
    }

    // Append to the live scenario; the pure engine reads errorScenarios on the
    // next dispatch and fires the injection. No engine modification needed.
    set({
      scenario: {
        ...scenario,
        errorScenarios: [...scenario.errorScenarios, injected],
      },
    })
  },

  reset() {
    set({
      session: null,
      scenario: null,
      result: null,
      score: null,
      sessionResult: null,
      scenarioKey: null,
      saveStatus: "idle",
      saveError: null,
      savedSessionId: null,
      softKeyPulseCount: 0,
      actionCount: 0,
      estimatedTotalSteps: 0,
      coaching: COACHING_HIDDEN,
    })
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
