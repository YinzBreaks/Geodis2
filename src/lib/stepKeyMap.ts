/**
 * stepKeyMap.ts — maps "key-only" WorkflowSteps to their expected soft key
 *
 * A "key-only" step is one whose transition table contains ONLY KEY_PRESS
 * entries — no CONFIRM or SCAN transitions.  The Continue button must be
 * hidden on these steps; the trainee must press the highlighted soft key.
 *
 * Per transitions.ts — each entry has been verified against the transition map.
 * Per BBWD-WI-030 §5.1 / §5.2 / §6.
 */

import { WorkflowStep } from "@/types/domain"

/**
 * Maps key-only WorkflowSteps to the `keys` string of the expected SoftKeyBar button.
 * Values match the `SOFT_KEYS[n].keys` constants in SoftKeyBar.tsx.
 */
const STEP_KEY_MAP: Partial<Record<WorkflowStep, string>> = {
  // Build Cart — CTRL+T changes task group (§5.1.8)
  [WorkflowStep.BC_PRESS_CTRL_T]: "CTRL+T",

  // Build Cart — ENTER×2 confirms task group (§5.1.8)
  // The ENT button fires getEnterKeyAction → ENTER+ENTER
  [WorkflowStep.BC_CONFIRM_TASK_GROUP]: "ENTER",

  // Pick — CTRL+A confirms End Of Tote (§5.2.14)
  [WorkflowStep.PK_END_OF_TOTE_DISPLAY]: "CTRL+A",

  // Exceptions — CTRL+W to go back (§6.3/§6.4)
  [WorkflowStep.EX_INCORRECT_LOCATION]: "CTRL+W",
  [WorkflowStep.EX_INCORRECT_TOTE]: "CTRL+W",
  [WorkflowStep.EX_PRESS_CTRL_W]: "CTRL+W",

  // Exceptions — CTRL+K to skip pick (§6.5.1/§6.6)
  [WorkflowStep.EX_PRESS_CTRL_K]: "CTRL+K",
}

/**
 * Returns the soft key `keys` string that should be highlighted (and pulsed)
 * for a given WorkflowStep, or `undefined` if the step accepts a CONFIRM action
 * (Continue button should be shown instead).
 *
 * @example
 *   getExpectedKey(WorkflowStep.BC_PRESS_CTRL_T)   // "CTRL+T"
 *   getExpectedKey(WorkflowStep.PK_SCAN_ITEM_UPC)  // undefined
 */
export function getExpectedKey(step: WorkflowStep): string | undefined {
  return STEP_KEY_MAP[step]
}
