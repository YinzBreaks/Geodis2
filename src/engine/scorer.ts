/**
 * scorer.ts — Simulation scoring engine
 *
 * Calculates the final SessionScore for a completed simulation session.
 * Scoring formula: (accuracyScore × 0.6) + (speedScore × 0.4)
 * Per SIMULATION.md §Scoring Engine and CLAUDE.md §Simulations
 */

import {
  ScanResult,
  type ScoreBand,
  type SessionResult,
  type SimulationSession,
  type SimulationScenario,
  type SessionScore,
  type WarehouseLocation,
} from "@/types/domain"
import { evaluateTraversal, evaluateDay2PassGate } from "@/engine/routing-engine"
import {
  calculateTotePutAccuracy,
  calculateMeanTotePutLatency,
  evaluateDay3PassGate,
} from "@/engine/cart-engine"
import {
  calculateMeanExceptionLatency,
  evaluateDay4PassGate,
} from "@/engine/exception-engine"

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

  // TODO: Replace 150 with confirmed facility benchmark
  //       from GEODIS operations. See CLAUDE.md open decisions.
  //       Ask: Anthony Kruse or Ed Meeks.
  const TARGET_PICKS_PER_HOUR = scenario.targetPicksPerHour ?? 150

  // When totalTimeMs has not yet been stamped (session still in progress),
  // fall back to actual wall-clock elapsed time so speed scoring remains live.
  // Per task spec: totalTimeMs null/undefined → use Date.now() − startedAt.
  const elapsedMs =
    session.totalTimeMs ?? (Date.now() - session.startedAt.getTime())
  const elapsedHours = elapsedMs / 3_600_000

  // Guard against zero elapsed time to prevent divide-by-zero
  const actualPicksPerHour =
    elapsedHours > 0 ? session.completedPicks.length / elapsedHours : 0

  // Speed score is capped at 100 (cannot exceed the target)
  const speedRate = Math.min(actualPicksPerHour / TARGET_PICKS_PER_HOUR, 1)
  const speedScore = Math.round(speedRate * 100)

  const { accuracy, speed } = scenario.scoringWeights
  const finalScore = Math.round(accuracyScore * accuracy + speedScore * speed)

  const totalPicks = session.completedPicks.length
  const checkDigitScanRate =
    totalPicks > 0
      ? Math.min(
          100,
          Math.round(((session.checkDigitsVerified ?? 0) / totalPicks) * 100)
        )
      : 100
  const firstTimePickAccuracy = Math.round(accuracyRate * 100)
  const cognitiveLatencyMs =
    (session.checkDigitsVerified ?? 0) > 0
      ? Math.round(
          (session.totalCognitiveLatencyMs ?? 0) /
            (session.checkDigitsVerified ?? 1)
        )
      : 0
  const sequenceBypasses = session.sequenceBypasses ?? 0
  const day1Passed =
    checkDigitScanRate === 100 &&
    firstTimePickAccuracy >= 98 &&
    sequenceBypasses === 0

  // Day 2 Serpentine Routing & Spatial Traversal Evaluation
  const actualLocations = session.completedPicks
    .map(
      (p) =>
        session.pickQueue.find((t) => t.pickTaskId === p.pickTaskId)?.location
    )
    .filter((loc): loc is WarehouseLocation => Boolean(loc))
  const optimalLocations = session.pickQueue.map((p) => p.location)
  const pickTimestamps = session.completedPicks.map((p) => p.scannedAt)

  const traversalReport = evaluateTraversal(
    actualLocations,
    optimalLocations,
    pickTimestamps
  )
  const pathEfficiency = session.pathEfficiency ?? traversalReport.efficiencyScore
  const backtrackViolations =
    session.backtrackViolations ?? traversalReport.backtracks.length
  const cadenceVariance = traversalReport.cadenceCv
  const day2Passed =
    pathEfficiency >= 95 &&
    firstTimePickAccuracy >= 99 &&
    backtrackViolations === 0 &&
    cadenceVariance <= 0.30

  // Day 3 High-Density Wave Telemetry
  const totePutAccuracy = calculateTotePutAccuracy(
    totalPicks,
    session.misSlotAttempts ?? 0
  )
  const meanTotePutLatencySeconds = calculateMeanTotePutLatency(
    session.totePutLatencies ?? []
  )
  const verticalTierFtpa = firstTimePickAccuracy
  const sustainedUph = Math.round(actualPicksPerHour)
  const day3Passed = evaluateDay3PassGate(
    totePutAccuracy,
    meanTotePutLatencySeconds,
    verticalTierFtpa,
    sustainedUph
  )

  // Day 4 Industrial Exceptions Telemetry
  const prematureToteDrops = session.prematureToteDrops ?? 0
  const exceptionResolutionLatencySeconds = calculateMeanExceptionLatency(
    session.exceptionResolutionLatencies ?? []
  )
  const icDiscrepancyAccuracy = 100
  const hazmatComplianceScore = 100
  const day4Passed = evaluateDay4PassGate(
    prematureToteDrops,
    exceptionResolutionLatencySeconds,
    icDiscrepancyAccuracy,
    hazmatComplianceScore
  )

  return {
    sessionId: session.sessionId,
    totalPicks,
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
    checkDigitScanRate,
    firstTimePickAccuracy,
    cognitiveLatencyMs,
    sequenceBypasses,
    day1Passed,
    pathEfficiency,
    backtrackViolations,
    cadenceVariance,
    day2Passed,
    totePutAccuracy,
    meanTotePutLatencySeconds,
    verticalTierFtpa,
    sustainedUph,
    day3Passed,
    prematureToteDrops,
    exceptionResolutionLatencySeconds,
    icDiscrepancyAccuracy,
    hazmatComplianceScore,
    day4Passed,
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE BAND
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive the performance band from a final score and passing threshold.
 *
 *   EXCELLENT:   finalScore >= 90
 *   PASS:        finalScore >= passThreshold (and < 90)
 *   BORDERLINE:  finalScore >= passThreshold - 10 (and < passThreshold)
 *   FAIL:        finalScore < passThreshold - 10
 */
export function computeBand(
  finalScore: number,
  passThreshold: number
): ScoreBand {
  if (finalScore >= 90) return "EXCELLENT"
  if (finalScore >= passThreshold) return "PASS"
  if (finalScore >= passThreshold - 10) return "BORDERLINE"
  return "FAIL"
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK GENERATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate human-readable strength and improvement feedback lines.
 *
 * Rules per task spec:
 *   Strengths:
 *     - accuracyScore >= 95  → "Perfect scan accuracy — zero wrong items"
 *     - accuracyScore >= 85  → "Strong scan accuracy"
 *     - all exceptions resolved → "Resolved every exception correctly"
 *     - finished <= 90 % of time target → "Completed well within time target"
 *
 *   Improvements:
 *     - accuracyScore < 70   → verify item barcodes (§5.2.8)
 *     - WRONG_ITEM unresolved → invalid item procedure (§6.5)
 *     - ITEM_NOT_FOUND unresolved → short inventory procedure (§6.6)
 *     - finished > 120 % of time target → pick speed feedback
 *
 *   Always returns ≥ 1 strength and ≥ 1 improvement (defaults if nothing qualifies).
 *
 * @param result             Computed session metrics (no band/strengths/improvements yet)
 * @param scenarioTargetSeconds  estimatedMinutes × 60 for the scenario
 */
export function generateFeedback(
  result: Omit<SessionResult, "strengths" | "improvements" | "band">,
  scenarioTargetSeconds: number
): { strengths: string[]; improvements: string[] } {
  const strengths: string[] = []
  const improvements: string[] = []

  // ── Strengths ─────────────────────────────────────────────────────────────

  if (result.accuracyScore >= 95) {
    strengths.push("Perfect scan accuracy — zero wrong items")
  } else if (result.accuracyScore >= 85) {
    strengths.push("Strong scan accuracy")
  }

  if (
    result.errorsEncountered.length > 0 &&
    result.exceptionsResolved === result.errorsEncountered.length
  ) {
    strengths.push("Resolved every exception correctly")
  }

  if (
    result.durationSeconds > 0 &&
    result.durationSeconds <= scenarioTargetSeconds * 0.9
  ) {
    strengths.push("Completed well within time target")
  }

  // ── Improvements ─────────────────────────────────────────────────────────

  if (result.accuracyScore < 70) {
    improvements.push(
      "Scan accuracy needs work — verify item barcodes before scanning (§5.2.8)"
    )
  }

  // Detect unresolved exceptions: any injected error type present AND
  // at least one injected exception was not corrected.
  const hasUnresolved =
    result.errorsEncountered.length > 0 &&
    result.exceptionsResolved < result.errorsEncountered.length

  if (hasUnresolved && result.errorsEncountered.includes(ScanResult.WRONG_ITEM)) {
    improvements.push("Review invalid item procedure (§6.5)")
  }

  if (
    hasUnresolved &&
    result.errorsEncountered.includes(ScanResult.ITEM_NOT_FOUND)
  ) {
    improvements.push("Review short inventory procedure (§6.6)")
  }

  if (
    scenarioTargetSeconds > 0 &&
    result.durationSeconds > scenarioTargetSeconds * 1.2
  ) {
    improvements.push("Work on pick speed — aim for 150 picks/hour")
  }

  // ── Defaults (always return ≥ 1 of each) ─────────────────────────────────

  if (strengths.length === 0) {
    strengths.push("Completed the simulation")
  }

  if (improvements.length === 0) {
    improvements.push("Keep practicing to improve speed and accuracy")
  }

  return { strengths, improvements }
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL SESSION RESULT (composes calculateScore + computeBand + generateFeedback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the complete SessionResult for a finished simulation.
 *
 * This is the single authoritative function for producing results:
 *   1. Calculates raw scores via calculateScore()
 *   2. Derives band, duration, exception stats
 *   3. Generates feedback via generateFeedback()
 *   4. Returns the full SessionResult ready for display and persistence
 *
 * Per CLAUDE.md §Simulations and SIMULATION.md §Scoring Engine
 */
export function computeSessionResult(
  session: SimulationSession,
  scenario: SimulationScenario
): SessionResult {
  const score = calculateScore(session, scenario)

  const elapsedMs =
    session.totalTimeMs ?? (Date.now() - session.startedAt.getTime())
  const durationSeconds = Math.round(elapsedMs / 1000)

  const scenarioTargetSeconds = scenario.estimatedMinutes * 60

  // Correct first scans = scan events with SUCCESS result
  const correctFirstScans = session.scanEvents.filter(
    (e) => e.result === ScanResult.SUCCESS
  ).length

  // Injected errors that actually fired during the session
  const errorsEncountered: ScanResult[] = session.errors
    .filter((e) => e.injected)
    .map((e) => e.errorType)

  // Injected errors that were resolved correctly
  const exceptionsResolved = session.errors.filter(
    (e) => e.injected && e.corrected
  ).length

  const band = computeBand(score.finalScore, scenario.passCriteria.minScore)

  const base: Omit<SessionResult, "strengths" | "improvements" | "band"> = {
    finalScore: score.finalScore,
    accuracyScore: score.accuracyScore,
    speedScore: score.speedScore,
    passed: score.passed,
    totalPicks: session.completedPicks.length,
    correctFirstScans,
    errorCount: session.errors.length,
    durationSeconds,
    errorsEncountered,
    exceptionsResolved,
    passThreshold: scenario.passCriteria.minScore,
    difficulty: session.difficulty,
    zone: session.cart.zone,
    scenarioTitle: scenario.title,
    checkDigitScanRate: score.checkDigitScanRate,
    firstTimePickAccuracy: score.firstTimePickAccuracy,
    cognitiveLatencyMs: score.cognitiveLatencyMs,
    sequenceBypasses: score.sequenceBypasses,
    day1Passed: score.day1Passed,
    pathEfficiency: score.pathEfficiency,
    backtrackViolations: score.backtrackViolations,
    cadenceVariance: score.cadenceVariance,
    day2Passed: score.day2Passed,
    totePutAccuracy: score.totePutAccuracy,
    meanTotePutLatencySeconds: score.meanTotePutLatencySeconds,
    verticalTierFtpa: score.verticalTierFtpa,
    sustainedUph: score.sustainedUph,
    day3Passed: score.day3Passed,
    prematureToteDrops: score.prematureToteDrops,
    exceptionResolutionLatencySeconds: score.exceptionResolutionLatencySeconds,
    icDiscrepancyAccuracy: score.icDiscrepancyAccuracy,
    hazmatComplianceScore: score.hazmatComplianceScore,
    day4Passed: score.day4Passed,
  }

  const { strengths, improvements } = generateFeedback(base, scenarioTargetSeconds)

  return { ...base, band, strengths, improvements }
}