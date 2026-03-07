/**
 * floorReadyConfig.ts — Floor-ready assessment thresholds
 *
 * Single source of truth for the floor-readiness algorithm.
 * These values are NEVER hardcoded in components or API routes — always
 * import FLOOR_READY_THRESHOLDS from this module.
 *
 * Per CLAUDE.md §Content Rules: the business goal is reducing onboarding
 * from 4 weeks to ≤ 2 weeks. These thresholds define "floor-ready".
 */

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD TYPE
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration shape for the floor-ready assessment algorithm. */
export interface FloorReadyThresholds {
  /**
   * Minimum finalScore on the most recent simulation attempt.
   * Score formula: (accuracy × 0.6) + (speed × 0.4).
   * Per BBWD-WI-030 §5.2 — trainees must demonstrate baseline competency.
   */
  minFinalScore: number

  /**
   * Minimum accuracyScore (0–100) on the most recent simulation attempt.
   * Accuracy is weighted higher than speed because pick errors cause
   * downstream mispacks. Per BBWD-WI-030 §5.2.
   */
  minAccuracyScore: number

  /**
   * Minimum all-time exception resolution rate (0–1).
   * Computed across ALL completed sessions, not just the most recent.
   * Per BBWD-WI-030 §6 — every exception type must be resolvable.
   */
  minExceptionResolutionRate: number

  /**
   * Minimum number of PASSED simulations (not just attempted).
   * Ensures the trainee has demonstrated competency multiple times,
   * not just once by luck.
   */
  minSimulationsCompleted: number

  /**
   * Whether the trainee must have encountered ALL 8 exception types
   * from BBWD-WI-030 §6 at least once across all sessions.
   * The 8 types: WRONG_ITEM, WRONG_TOTE, WRONG_LOCATION,
   * TOTE_ALLOCATED, CART_ALLOCATED, ITEM_NOT_FOUND,
   * ITEM_DAMAGED, TIMEOUT.
   */
  requireAllExceptionTypes: boolean

  /**
   * Whether at least one ADVANCED-difficulty simulation must be passed.
   * Advanced sims have tighter time limits and more injected errors.
   */
  requireAdvancedPass: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD VALUES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The canonical floor-ready thresholds.
 * Supervisors confirm readiness — these values only trigger the suggestion.
 * Stored as thresholdSnapshot in FloorReadySignoff at confirmation time.
 */
export const FLOOR_READY_THRESHOLDS: Readonly<FloorReadyThresholds> = {
  minFinalScore: 75,
  minAccuracyScore: 80,
  minExceptionResolutionRate: 0.90,
  minSimulationsCompleted: 3,
  requireAllExceptionTypes: true,
  requireAdvancedPass: true,
} as const
