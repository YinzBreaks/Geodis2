/**
 * floorReadiness.ts — Floor-ready assessment algorithm (pure functions)
 *
 * No DB calls, no React imports. All inputs are plain data structures.
 * Consumed by API routes and server components.
 *
 * Per CLAUDE.md §Content Rules: floor-ready is an automatic suggestion
 * confirmed by a supervisor. It is NEVER automatic.
 */

import { ScanResult, DifficultyLevel } from "@/types/domain"
import {
  FLOOR_READY_THRESHOLDS,
  type FloorReadyThresholds,
} from "@/config/floorReadyConfig"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** The three possible floor-ready statuses — no in-between. */
export type FloorReadyStatus = "FLOOR_READY" | "IN_PROGRESS" | "NEEDS_COACHING"

/** Statistics for one exception type across all sessions. */
export interface ExceptionStats {
  /** Number of times this exception was encountered */
  encountered: number
  /** Number of times it was resolved correctly */
  resolvedCorrectly: number
  /** Resolution rate (0–1) */
  resolutionRate: number
  /** Most frequent wrong WorkflowStep taken (human-readable) */
  commonMistake?: string
}

/** A single identified gap preventing floor-ready status. */
export interface FloorReadyGap {
  /** e.g. "Short Inventory resolution rate below 90%" */
  criterion: string
  /** e.g. "41%" */
  current: string
  /** e.g. "90%" */
  required: string
  /** e.g. "Assign sim-03-exceptions-advanced" */
  actionable: string
}

/** Score trend direction over recent sessions. */
export type ScoreTrend = "improving" | "plateauing" | "declining"

/** Complete floor-readiness assessment report. */
export interface FloorReadinessReport {
  status: FloorReadyStatus
  gaps: FloorReadyGap[]
  suggestedAt?: Date
  confirmedAt?: Date
  confirmedBy?: string
  exceptionCoverage: Record<string, ExceptionStats>
  scoreHistory: number[]
  trend: ScoreTrend
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT DATA SHAPES (DB-agnostic — matches Prisma row shapes)
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal session shape needed for assessment. Matches SimSession DB model. */
export interface SimSessionInput {
  id: string
  moduleId: string
  difficulty: string
  status: string
  finalScore: number | null
  accuracyScore: number | null
  passed: boolean | null
  scanEvents: unknown
  errors: unknown
  completedAt: Date | null
}

/** Minimal module progress shape. Matches ModuleProgress DB model. */
export interface ModuleProgressInput {
  moduleId: string
  completed: boolean
  bestScore: number
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN EVENT / ERROR SHAPES (parsed from JSON columns)
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of a ScanEvent stored in the JSON column. */
interface StoredScanEvent {
  step: string
  expectedValue: string
  scannedValue: string
  result: string
  responseTimeMs: number
}

/** Shape of a SimulationError stored in the JSON column. */
interface StoredSimulationError {
  errorType: string
  injected: boolean
  corrected: boolean
  correctionSteps: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// ALL 8 EXCEPTION SCAN RESULTS — per BBWD-WI-030 §6
// ─────────────────────────────────────────────────────────────────────────────

const ALL_EXCEPTION_TYPES: readonly string[] = [
  ScanResult.WRONG_ITEM,
  ScanResult.WRONG_TOTE,
  ScanResult.WRONG_LOCATION,
  ScanResult.TOTE_ALLOCATED,
  ScanResult.CART_ALLOCATED,
  ScanResult.ITEM_NOT_FOUND,
  ScanResult.ITEM_DAMAGED,
  ScanResult.TIMEOUT,
] as const

// Human-readable labels for exception types
const EXCEPTION_LABELS: Record<string, string> = {
  [ScanResult.WRONG_ITEM]: "Invalid Item",
  [ScanResult.WRONG_TOTE]: "Incorrect Tote",
  [ScanResult.WRONG_LOCATION]: "Incorrect Location",
  [ScanResult.TOTE_ALLOCATED]: "Tote Already Allocated",
  [ScanResult.CART_ALLOCATED]: "Pick Cart Already Created",
  [ScanResult.ITEM_NOT_FOUND]: "Short Inventory",
  [ScanResult.ITEM_DAMAGED]: "Damaged Item",
  [ScanResult.TIMEOUT]: "Scan Timeout",
}

// Suggested simulation assignments for each gap type
const EXCEPTION_REMEDIATION: Record<string, string> = {
  [ScanResult.WRONG_ITEM]: "Assign sim-03-exceptions-advanced (Invalid Item scenarios)",
  [ScanResult.WRONG_TOTE]: "Assign sim-03-exceptions-advanced (Incorrect Tote scenarios)",
  [ScanResult.WRONG_LOCATION]: "Assign sim-02-exceptions-intermediate (Location verification)",
  [ScanResult.TOTE_ALLOCATED]: "Assign sim-01-build-cart (Tote allocation handling)",
  [ScanResult.CART_ALLOCATED]: "Assign sim-01-build-cart (Cart allocation handling)",
  [ScanResult.ITEM_NOT_FOUND]: "Assign sim-03-exceptions-advanced (Short Inventory path)",
  [ScanResult.ITEM_DAMAGED]: "Assign sim-03-exceptions-advanced (Damaged Item path)",
  [ScanResult.TIMEOUT]: "Practice scan speed drills — reduce response time",
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: parse JSON columns safely
// ─────────────────────────────────────────────────────────────────────────────

/** Safely parse scan events from a JSON column. */
function parseScanEvents(raw: unknown): StoredScanEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is StoredScanEvent =>
      typeof e === "object" &&
      e !== null &&
      "result" in e &&
      "step" in e
  )
}

/** Safely parse simulation errors from a JSON column. */
function parseErrors(raw: unknown): StoredSimulationError[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (e): e is StoredSimulationError =>
      typeof e === "object" &&
      e !== null &&
      "errorType" in e &&
      "corrected" in e
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine exception coverage statistics across all sessions.
 * Aggregates scan events and errors to compute per-exception-type stats.
 *
 * @param sessions - All completed simulation sessions for one trainee.
 * @returns Record keyed by ScanResult, with ExceptionStats per type.
 */
export function getExceptionCoverage(
  sessions: SimSessionInput[]
): Record<string, ExceptionStats> {
  const coverage: Record<string, ExceptionStats> = {}

  // Initialize all exception types
  for (const exType of ALL_EXCEPTION_TYPES) {
    coverage[exType] = {
      encountered: 0,
      resolvedCorrectly: 0,
      resolutionRate: 0,
    }
  }

  // Track wrong steps per exception type for commonMistake
  const wrongSteps: Record<string, Record<string, number>> = {}
  for (const exType of ALL_EXCEPTION_TYPES) {
    wrongSteps[exType] = {}
  }

  for (const session of sessions) {
    const errors = parseErrors(session.errors)
    const scanEvents = parseScanEvents(session.scanEvents)

    // Count errors by type
    for (const error of errors) {
      const exType = error.errorType
      if (!(exType in coverage)) continue

      coverage[exType].encountered += 1
      if (error.corrected) {
        coverage[exType].resolvedCorrectly += 1
      }

      // Track incorrect correction steps for commonMistake
      if (!error.corrected && error.correctionSteps.length > 0) {
        const lastStep = error.correctionSteps[error.correctionSteps.length - 1]
        wrongSteps[exType][lastStep] = (wrongSteps[exType][lastStep] ?? 0) + 1
      }
    }

    // Also count non-SUCCESS scan events that map to exception types
    for (const evt of scanEvents) {
      if (evt.result === ScanResult.SUCCESS) continue
      if (!(evt.result in coverage)) continue

      // Only count if not already counted via errors array
      // Use heuristic: if no matching error was found, count the scan event
      const hasMatchingError = errors.some(
        (e) => e.errorType === evt.result
      )
      if (!hasMatchingError) {
        coverage[evt.result].encountered += 1
        // Non-error scan events that aren't SUCCESS are unresolved
      }
    }
  }

  // Compute resolution rates and commonMistake
  for (const exType of ALL_EXCEPTION_TYPES) {
    const stats = coverage[exType]
    stats.resolutionRate =
      stats.encountered > 0
        ? stats.resolvedCorrectly / stats.encountered
        : 0

    // Find most frequent wrong step
    const steps = wrongSteps[exType]
    let maxCount = 0
    let maxStep: string | undefined
    for (const [step, count] of Object.entries(steps)) {
      if (count > maxCount) {
        maxCount = count
        maxStep = step
      }
    }
    if (maxStep) {
      stats.commonMistake = maxStep
    }
  }

  return coverage
}

/**
 * Compute score trend from a series of finalScores.
 *
 * - improving:  last 3 scores each higher than previous
 * - declining:  last 3 scores each lower than previous
 * - plateauing: anything else
 *
 * @param scores - Array of finalScore values in chronological order.
 */
export function getScoreTrend(scores: number[]): ScoreTrend {
  if (scores.length < 3) return "plateauing"

  const last3 = scores.slice(-3)

  const improving = last3[1] > last3[0] && last3[2] > last3[1]
  if (improving) return "improving"

  const declining = last3[1] < last3[0] && last3[2] < last3[1]
  if (declining) return "declining"

  return "plateauing"
}

/**
 * Identify specific gaps preventing floor-ready status.
 *
 * @param sessions - All completed simulation sessions for the trainee.
 * @param progress - Module progress records for the trainee.
 * @param thresholds - Floor-ready threshold config (defaults to canonical values).
 * @returns Array of identified gaps with actionable remediation.
 */
export function getGaps(
  sessions: SimSessionInput[],
  progress: ModuleProgressInput[],
  thresholds: FloorReadyThresholds = FLOOR_READY_THRESHOLDS
): FloorReadyGap[] {
  const gaps: FloorReadyGap[] = []

  // Completed and passed sessions
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED")
  const passedSessions = completedSessions.filter((s) => s.passed === true)

  // Latest completed session
  const sorted = [...completedSessions].sort(
    (a, b) =>
      (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)
  )
  const latest = sorted[0]

  // 1. minFinalScore — last attempt
  if (!latest || (latest.finalScore ?? 0) < thresholds.minFinalScore) {
    gaps.push({
      criterion: `Final score below ${thresholds.minFinalScore}`,
      current: latest ? `${Math.round(latest.finalScore ?? 0)}` : "No sessions",
      required: `${thresholds.minFinalScore}`,
      actionable: "Continue practicing simulations to improve overall score",
    })
  }

  // 2. minAccuracyScore — last attempt
  if (!latest || (latest.accuracyScore ?? 0) < thresholds.minAccuracyScore) {
    gaps.push({
      criterion: `Accuracy score below ${thresholds.minAccuracyScore}`,
      current: latest
        ? `${Math.round(latest.accuracyScore ?? 0)}`
        : "No sessions",
      required: `${thresholds.minAccuracyScore}`,
      actionable: "Focus on scan verification — double-check item UPC before scanning",
    })
  }

  // 3. minSimulationsCompleted
  if (passedSessions.length < thresholds.minSimulationsCompleted) {
    gaps.push({
      criterion: `Fewer than ${thresholds.minSimulationsCompleted} passed simulations`,
      current: `${passedSessions.length}`,
      required: `${thresholds.minSimulationsCompleted}`,
      actionable: "Complete more simulation rounds and achieve passing scores",
    })
  }

  // 4. requireAdvancedPass
  if (thresholds.requireAdvancedPass) {
    const hasAdvancedPass = passedSessions.some(
      (s) => s.difficulty === DifficultyLevel.ADVANCED
    )
    if (!hasAdvancedPass) {
      gaps.push({
        criterion: "No ADVANCED simulation passed",
        current: "None",
        required: "≥1 ADVANCED pass",
        actionable: "Attempt an ADVANCED difficulty simulation (HAZ or multi-error)",
      })
    }
  }

  // 5. Exception coverage
  const coverage = getExceptionCoverage(sessions)

  // 5a. minExceptionResolutionRate (all-time aggregate)
  let totalEncountered = 0
  let totalResolved = 0
  for (const stats of Object.values(coverage)) {
    totalEncountered += stats.encountered
    totalResolved += stats.resolvedCorrectly
  }
  const overallRate =
    totalEncountered > 0 ? totalResolved / totalEncountered : 0

  if (overallRate < thresholds.minExceptionResolutionRate) {
    gaps.push({
      criterion: `Exception resolution rate below ${Math.round(thresholds.minExceptionResolutionRate * 100)}%`,
      current: `${Math.round(overallRate * 100)}%`,
      required: `${Math.round(thresholds.minExceptionResolutionRate * 100)}%`,
      actionable: "Review SOP §6 exception handling procedures and practice exception scenarios",
    })
  }

  // 5b. Per-exception-type resolution rates
  for (const exType of ALL_EXCEPTION_TYPES) {
    const stats = coverage[exType]
    if (
      stats.encountered > 0 &&
      stats.resolutionRate < thresholds.minExceptionResolutionRate
    ) {
      const label = EXCEPTION_LABELS[exType] ?? exType
      gaps.push({
        criterion: `${label} resolution rate below ${Math.round(thresholds.minExceptionResolutionRate * 100)}%`,
        current: `${Math.round(stats.resolutionRate * 100)}%`,
        required: `${Math.round(thresholds.minExceptionResolutionRate * 100)}%`,
        actionable: EXCEPTION_REMEDIATION[exType] ?? `Practice ${label} scenarios`,
      })
    }
  }

  // 5c. requireAllExceptionTypes
  if (thresholds.requireAllExceptionTypes) {
    const missingTypes = ALL_EXCEPTION_TYPES.filter(
      (exType) => coverage[exType].encountered === 0
    )
    if (missingTypes.length > 0) {
      const labels = missingTypes
        .map((t) => EXCEPTION_LABELS[t] ?? t)
        .join(", ")
      gaps.push({
        criterion: "Not all 8 exception types encountered",
        current: `Missing: ${labels}`,
        required: "All 8 exception types seen at least once",
        actionable:
          "Assign simulations that inject missing exception types: " + labels,
      })
    }
  }

  return gaps
}

/**
 * Full floor-readiness assessment for one trainee.
 *
 * Status logic:
 * - FLOOR_READY:    all thresholds met (supervisor can confirm)
 * - NEEDS_COACHING: score pattern or exception gap flagged
 * - IN_PROGRESS:    making progress, specific gaps identified
 *
 * @param sessions - All simulation sessions for this trainee.
 * @param progress - All module progress records for this trainee.
 * @returns Complete FloorReadinessReport.
 */
export function assessFloorReadiness(
  sessions: SimSessionInput[],
  progress: ModuleProgressInput[]
): FloorReadinessReport {
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED")

  // Score history (chronological)
  const scoreHistory = completedSessions
    .filter((s) => s.finalScore !== null)
    .sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0)
    )
    .map((s) => s.finalScore as number)

  const trend = getScoreTrend(scoreHistory)
  const exceptionCoverage = getExceptionCoverage(sessions)
  const gaps = getGaps(sessions, progress)

  // Determine status
  let status: FloorReadyStatus

  if (gaps.length === 0) {
    status = "FLOOR_READY"
  } else {
    // NEEDS_COACHING if:
    //   - trend is declining, OR
    //   - exception resolution rate is below threshold, OR
    //   - latest score is below 50 (far from passing)
    const hasLowExceptionRate = Object.values(exceptionCoverage).some(
      (stats) =>
        stats.encountered > 0 &&
        stats.resolutionRate < FLOOR_READY_THRESHOLDS.minExceptionResolutionRate
    )

    const latestScore =
      scoreHistory.length > 0 ? scoreHistory[scoreHistory.length - 1] : 0

    if (
      completedSessions.length > 0 &&
      (trend === "declining" || hasLowExceptionRate || latestScore < 50)
    ) {
      status = "NEEDS_COACHING"
    } else {
      status = "IN_PROGRESS"
    }
  }

  return {
    status,
    gaps,
    suggestedAt: status === "FLOOR_READY" ? new Date() : undefined,
    exceptionCoverage,
    scoreHistory,
    trend,
  }
}
