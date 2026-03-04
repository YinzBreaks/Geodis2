/**
 * scorer.ts — Simulation scoring engine
 *
 * Calculates the final SessionScore for a completed simulation session.
 * Scoring formula: (accuracyScore × 0.6) + (speedScore × 0.4)
 * Per SIMULATION.md §Scoring Engine and CLAUDE.md §Simulations
 */

import {
  ScanResult,
  type SimulationSession,
  type SimulationScenario,
  type SessionScore,
} from "@/types/domain"

/**
 * Calculate the final score for a completed simulation session.
 *
 * Accuracy (60% weight):
 *   correctFirstScans / totalScans × 100
 *
 * Speed (40% weight, capped at 100):
 *   (actualPicksPerHour / targetPicksPerHour) × 100
 *   Target: scenario.targetPicksPerHour ?? 150
 *   Per CLAUDE.md: TBD — confirm actual picks-per-hour benchmark with GEODIS operations
 *
 * Per SIMULATION.md §Scoring Engine and CLAUDE.md §Simulations
 */
export function calculateScore(
  session: SimulationSession,
  scenario: SimulationScenario
): SessionScore {
  const totalScans = session.scanEvents.length
  const correctFirstScans = session.scanEvents.filter(
    (e) => e.result === ScanResult.SUCCESS
  ).length

  // Guard against zero scans to prevent divide-by-zero
  const accuracyRate = totalScans > 0 ? correctFirstScans / totalScans : 0
  const accuracyScore = Math.round(accuracyRate * 100)

  // Per CLAUDE.md: TBD — confirm actual picks-per-hour benchmark with GEODIS operations.
  // Defaults to 150 until confirmed.
  const TARGET_PICKS_PER_HOUR = scenario.targetPicksPerHour ?? 150
  const elapsedHours = (session.totalTimeMs ?? 0) / 3_600_000

  // Guard against zero elapsed time to prevent divide-by-zero
  const actualPicksPerHour =
    elapsedHours > 0 ? session.completedPicks.length / elapsedHours : 0

  // Speed score is capped at 100 (cannot exceed the target)
  const speedRate = Math.min(actualPicksPerHour / TARGET_PICKS_PER_HOUR, 1)
  const speedScore = Math.round(speedRate * 100)

  const { accuracy, speed } = scenario.scoringWeights
  const finalScore = Math.round(accuracyScore * accuracy + speedScore * speed)

  return {
    sessionId: session.sessionId,
    totalPicks: session.completedPicks.length,
    correctFirstScanRate: accuracyRate,
    errorCount: session.errors.length,
    correctedErrorCount: session.errors.filter((e) => e.corrected).length,
    averageResponseTimeMs:
      totalScans > 0
        ? session.scanEvents.reduce((sum, e) => sum + e.responseTimeMs, 0) /
          totalScans
        : 0,
    accuracyScore,
    speedScore,
    finalScore,
    passed: finalScore >= scenario.passCriteria.minScore,
    passingThreshold: scenario.passCriteria.minScore,
  }
}
