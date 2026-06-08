/**
 * gamification.ts — Derived gamification stats (Overhaul 3C)
 *
 * Pure functions that compute a live score, streak, accuracy, and pace from a
 * SimulationSession. Everything is DERIVED from the session's existing
 * scanEvents + completedPicks — no engine changes, no dispatch interception,
 * no separate mutable store. Components call computeGameStats(session) and
 * re-render reactively as the session updates.
 *
 * Scoring (per Overhaul 3C):
 *   +100  correct scan on first attempt
 *   -50   wrong scan attempt
 *   Streak: consecutive correct scans with no error in between.
 *   At a 10-streak, the next 3 successful scans earn a 1.5× multiplier.
 *   Time bonus: max(0, 300 − secondsElapsed) per completed pick.
 */

import { ScanResult, type SimulationSession } from "@/types/domain"

const POINTS_CORRECT = 100
const POINTS_WRONG = -50
const STREAK_MULTIPLIER_THRESHOLD = 10
const MULTIPLIER = 1.5
const MULTIPLIER_PICKS = 3
const TIME_BONUS_CEILING_SEC = 300

export interface GameStats {
  /** Cumulative score (never negative). */
  score: number
  /** Current consecutive-correct streak. */
  streak: number
  /** Best streak reached this session. */
  bestStreak: number
  /** First-attempt accuracy 0–1 (correct scans / total scans). */
  accuracy: number
  /** Total scan attempts so far. */
  totalScans: number
  /** Completed picks count. */
  picksCompleted: number
  /** Total picks in the queue. */
  picksTotal: number
  /** Extrapolated picks/hour from elapsed session time. */
  pace: number
  /** True while the 10-streak 1.5× multiplier window is active. */
  multiplierActive: boolean
}

/**
 * Compute live gamification stats from a session. Deterministic and pure —
 * the same session always yields the same stats.
 */
export function computeGameStats(session: SimulationSession): GameStats {
  let score = 0
  let streak = 0
  let bestStreak = 0
  let multiplierRemaining = 0

  for (const event of session.scanEvents) {
    if (event.result === ScanResult.SUCCESS) {
      const base = POINTS_CORRECT
      const earned =
        multiplierRemaining > 0 ? Math.round(base * MULTIPLIER) : base
      score += earned
      if (multiplierRemaining > 0) multiplierRemaining -= 1

      streak += 1
      if (streak > bestStreak) bestStreak = streak

      // Crossing the streak threshold opens the multiplier window.
      if (streak === STREAK_MULTIPLIER_THRESHOLD) {
        multiplierRemaining = MULTIPLIER_PICKS
      }
    } else {
      score += POINTS_WRONG
      streak = 0
      multiplierRemaining = 0
    }
  }

  // Per-pick time bonus.
  const elapsedMs = Date.now() - session.startedAt.getTime()
  const elapsedSec = elapsedMs / 1000
  const elapsedHours = elapsedMs / 3_600_000
  const picksCompleted = session.completedPicks.length
  const secondsPerPick = picksCompleted > 0 ? elapsedSec / picksCompleted : 0
  const timeBonus =
    picksCompleted *
    Math.max(0, Math.round(TIME_BONUS_CEILING_SEC - secondsPerPick))
  score += timeBonus

  const totalScans = session.scanEvents.length
  const correct = session.scanEvents.filter(
    (e) => e.result === ScanResult.SUCCESS
  ).length

  return {
    score: Math.max(0, score),
    streak,
    bestStreak,
    accuracy: totalScans > 0 ? correct / totalScans : 1,
    totalScans,
    picksCompleted,
    picksTotal: session.pickQueue.length,
    pace: elapsedHours > 0 ? Math.round(picksCompleted / elapsedHours) : 0,
    multiplierActive: multiplierRemaining > 0,
  }
}

/** Letter grade from accuracy + pace, for the completion summary. */
export function gradeFromStats(stats: GameStats, targetPace = 100): string {
  const acc = stats.accuracy
  const paceRatio = targetPace > 0 ? Math.min(stats.pace / targetPace, 1) : 0
  const composite = acc * 0.7 + paceRatio * 0.3
  if (composite >= 0.9) return "A"
  if (composite >= 0.8) return "B"
  if (composite >= 0.65) return "C"
  return "D"
}
