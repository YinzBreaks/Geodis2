/**
 * coaching.ts — Coaching system types for BEGINNER mode
 *
 * Coaching is only active when session.difficulty === BEGINNER.
 * Every WorkflowStep in the build-cart and pick flow has associated
 * coaching content defined in /src/data/coachingContent.ts.
 *
 * Per CLAUDE.md §Content Rules §Labs: step-by-step with hints,
 * explain the "why" behind each step.
 */

import type { WorkflowStep } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// COACHING CONTENT
// One entry per WorkflowStep — drives CoachingPanel display
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-step coaching content shown in BEGINNER mode.
 *
 * action     — imperative instruction: what to do RIGHT NOW
 * sopContext — the "why" behind this step, with SOP section reference
 * fieldDef   — plain-English definition of the active field (optional)
 * highlightLine — 0-based index into screen.lines to highlight with tooltip arrow
 */
export interface CoachingContent {
  /**
   * Short imperative instruction — what to do RIGHT NOW.
   * e.g. "Press ^T in the key bar below"
   */
  action: string
  /**
   * Why this step exists — should reference the SOP section.
   * e.g. "§5.1.8 — Pressing CTRL+T changes your Task Group so the system
   * assigns you the right pick zone."
   */
  sopContext: string
  /**
   * Plain-English definition of the highlighted field.
   * Only set when the field label is warehouse jargon.
   * e.g. "ALOC = Aisle Location — the physical shelf address."
   */
  fieldDef?: string
  /**
   * Which line in screen.lines to point the tooltip arrow at (0-based).
   * undefined = no tooltip arrow rendered.
   */
  highlightLine?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// COACHING STATE
// Lives in the Zustand store — updated by the engine on each step change
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runtime coaching state stored in the Zustand simulation store.
 *
 * isVisible    — whether CoachingPanel should be shown right now
 * content      — the content to display (null when no coaching for the step)
 * step         — the WorkflowStep this content belongs to
 * dismissedAt  — timestamp when coaching was dismissed by a correct action
 */
export interface CoachingState {
  isVisible: boolean
  content: CoachingContent | null
  step: WorkflowStep | null
  dismissedAt?: number
}
