import { DifficultyLevel, ScanResult, WorkflowStep } from "@/types/domain"
import { SCENARIO_DATA, type ScenarioBundle } from "@/data/seedData"

export interface PersistedScanEvent {
  scanEventId: string
  sessionId: string
  step: WorkflowStep
  expectedValue: string
  scannedValue: string
  result: ScanResult
  timestamp: string
  responseTimeMs: number
}

export interface PersistedSimulationError {
  errorId: string
  sessionId: string
  step: WorkflowStep
  errorType: ScanResult
  injected: boolean
  corrected: boolean
  correctionSteps: WorkflowStep[]
  occurredAt: string
  isLastItemAtLocation?: boolean
  pickIndex?: number
}

export interface SessionSubmission {
  sessionId: string
  scenarioId: string
  difficulty: DifficultyLevel
  finalScore: number
  accuracyScore: number
  speedScore: number
  passed: boolean
  totalPicks: number
  correctFirstScans: number
  errorCount: number
  durationSeconds: number
  totalTimeMs: number
  errorsEncountered: ScanResult[]
  exceptionsResolved: number
  scanEvents: PersistedScanEvent[]
  errors: PersistedSimulationError[]
}

export interface ExistingProgress {
  bestScore: number
  completed: boolean
  completedAt: Date | null
  timeSpentMs: number
}

export interface NextProgressState {
  bestScore: number
  completed: boolean
  completedAt: Date | null
  timeSpentMs: number
}

export type SessionSubmissionParseResult =
  | { success: true; data: SessionSubmission; bundle: ScenarioBundle }
  | { success: false; error: string }

const DIFFICULTIES = new Set<string>(Object.values(DifficultyLevel))
const WORKFLOW_STEPS = new Set<string>(Object.values(WorkflowStep))
const SCAN_RESULTS = new Set<string>(Object.values(ScanResult))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isScore(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function parseScanEvent(value: unknown): PersistedScanEvent | null {
  if (!isRecord(value)) return null
  if (
    typeof value.scanEventId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.step !== "string" ||
    !WORKFLOW_STEPS.has(value.step) ||
    typeof value.expectedValue !== "string" ||
    typeof value.scannedValue !== "string" ||
    typeof value.result !== "string" ||
    !SCAN_RESULTS.has(value.result) ||
    !isIsoDate(value.timestamp) ||
    !isFiniteNumber(value.responseTimeMs) ||
    value.responseTimeMs < 0
  ) {
    return null
  }

  return value as unknown as PersistedScanEvent
}

function parseSimulationError(value: unknown): PersistedSimulationError | null {
  if (!isRecord(value)) return null
  if (
    typeof value.errorId !== "string" ||
    typeof value.sessionId !== "string" ||
    typeof value.step !== "string" ||
    !WORKFLOW_STEPS.has(value.step) ||
    typeof value.errorType !== "string" ||
    !SCAN_RESULTS.has(value.errorType) ||
    typeof value.injected !== "boolean" ||
    typeof value.corrected !== "boolean" ||
    !Array.isArray(value.correctionSteps) ||
    !value.correctionSteps.every(
      (step) => typeof step === "string" && WORKFLOW_STEPS.has(step)
    ) ||
    !isIsoDate(value.occurredAt)
  ) {
    return null
  }

  if (
    value.pickIndex !== undefined &&
    !isNonNegativeInteger(value.pickIndex)
  ) {
    return null
  }

  if (
    value.isLastItemAtLocation !== undefined &&
    typeof value.isLastItemAtLocation !== "boolean"
  ) {
    return null
  }

  return value as unknown as PersistedSimulationError
}

function findScenarioBundle(moduleId: string): ScenarioBundle | null {
  return (
    Object.values(SCENARIO_DATA).find(
      (bundle) => bundle.scenario.moduleId === moduleId
    ) ?? null
  )
}

function expectedScanValue(
  event: PersistedScanEvent,
  bundle: ScenarioBundle,
  buildToteScanCount: number,
  pickIndex: number
): string | null {
  switch (event.step) {
    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      return bundle.scenario.zone
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return bundle.cart.cartBarcode
    case WorkflowStep.BC_SCAN_TOTE_BARCODE:
      return bundle.cart.totes[buildToteScanCount]?.barcode ?? null
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return bundle.pickQueue[pickIndex]?.item.upcBarcode ?? null
    case WorkflowStep.PK_SCAN_TOTE_BARCODE: {
      const pick = bundle.pickQueue[pickIndex]
      return pick
        ? bundle.cart.totes[pick.targetSlot - 1]?.barcode ?? null
        : null
    }
    default:
      return null
  }
}

function validateCanonicalScanEvents(
  events: PersistedScanEvent[],
  errors: PersistedSimulationError[],
  bundle: ScenarioBundle
): string | null {
  let buildToteScanCount = 0
  let pickIndex = 0
  const coveredPickIndices = new Set<number>()

  for (const event of events) {
    const expected = expectedScanValue(
      event,
      bundle,
      buildToteScanCount,
      pickIndex
    )
    if (expected !== null && event.expectedValue !== expected) {
      return `Expected value does not match scenario at ${event.step}`
    }

    // Failed scans intentionally contain the wrong submitted barcode; only
    // successful scans must equal the canonical value.
    if (
      event.result === ScanResult.SUCCESS &&
      expected !== null &&
      event.scannedValue !== expected
    ) {
      return `Successful scan does not match scenario at ${event.step}`
    }

    if (
      event.step === WorkflowStep.BC_SCAN_TOTE_BARCODE &&
      event.result === ScanResult.SUCCESS
    ) {
      buildToteScanCount += 1
    }
    if (
      event.step === WorkflowStep.PK_SCAN_TOTE_BARCODE &&
      event.result === ScanResult.SUCCESS
    ) {
      pickIndex += 1
    }
    if (
      event.step === WorkflowStep.PK_SCAN_ITEM_UPC &&
      event.result === ScanResult.SUCCESS
    ) {
      coveredPickIndices.add(pickIndex)
    }

    // A short-inventory error skips the current Pick without a tote scan.
    if (
      event.step === WorkflowStep.PK_SCAN_ITEM_UPC &&
      event.result !== ScanResult.SUCCESS &&
      errors.some(
        (error) =>
          error.pickIndex === pickIndex &&
          [
            ScanResult.WRONG_ITEM,
            ScanResult.ITEM_NOT_FOUND,
            ScanResult.ITEM_DAMAGED,
          ].includes(error.errorType)
      )
    ) {
      coveredPickIndices.add(pickIndex)
      pickIndex += 1
    }
  }

  if (buildToteScanCount !== 9) {
    return "Completed session must contain nine successful Build Cart tote scans"
  }
  if (pickIndex !== bundle.pickQueue.length) {
    return "Completed session Pick scans do not match the scenario queue"
  }
  if (coveredPickIndices.size !== bundle.pickQueue.length) {
    return "Every Pick must have a canonical item scan or exception resolution"
  }
  return null
}

/**
 * Anti-tamper timing check. The speed score divides totalPicks by
 * totalTimeMs, so a spoofed (shrunken) totalTimeMs inflates the score.
 * Event timestamps must be non-decreasing, and the claimed session duration
 * must cover at least the span of the recorded scan events.
 */
const TIMING_TOLERANCE_MS = 5_000

function validateEventTiming(
  events: PersistedScanEvent[],
  totalTimeMs: number
): string | null {
  if (events.length === 0) return null

  let prev = Date.parse(events[0].timestamp)
  for (const event of events.slice(1)) {
    const current = Date.parse(event.timestamp)
    if (current < prev) {
      return "Scan event timestamps are not in chronological order"
    }
    prev = current
  }

  const span = prev - Date.parse(events[0].timestamp)
  if (span > totalTimeMs + TIMING_TOLERANCE_MS) {
    return "Session duration is shorter than the recorded scan events"
  }
  return null
}

/** Validate a completed session submission against server-owned scenario data. */
export function parseSessionSubmission(
  value: unknown
): SessionSubmissionParseResult {
  if (!isRecord(value)) {
    return { success: false, error: "Invalid request body" }
  }

  if (
    typeof value.sessionId !== "string" ||
    value.sessionId.trim().length < 8 ||
    typeof value.scenarioId !== "string"
  ) {
    return { success: false, error: "Invalid session or scenario ID" }
  }

  const bundle = findScenarioBundle(value.scenarioId)
  if (!bundle) {
    return { success: false, error: "Unknown simulation scenario" }
  }

  if (
    typeof value.difficulty !== "string" ||
    !DIFFICULTIES.has(value.difficulty) ||
    value.difficulty !== bundle.scenario.difficulty
  ) {
    return { success: false, error: "Difficulty does not match scenario" }
  }

  if (
    !isScore(value.finalScore) ||
    !isScore(value.accuracyScore) ||
    !isScore(value.speedScore) ||
    typeof value.passed !== "boolean" ||
    !isNonNegativeInteger(value.totalPicks) ||
    !isNonNegativeInteger(value.correctFirstScans) ||
    !isNonNegativeInteger(value.errorCount) ||
    !isFiniteNumber(value.durationSeconds) ||
    value.durationSeconds < 0 ||
    !isNonNegativeInteger(value.totalTimeMs) ||
    value.durationSeconds !== Math.round(value.totalTimeMs / 1000) ||
    !isNonNegativeInteger(value.exceptionsResolved)
  ) {
    return { success: false, error: "Invalid session metrics" }
  }

  if (!Array.isArray(value.scanEvents) || !Array.isArray(value.errors)) {
    return { success: false, error: "Session events are required" }
  }

  const scanEvents = value.scanEvents.map(parseScanEvent)
  const errors = value.errors.map(parseSimulationError)
  if (scanEvents.some((event) => event === null) || errors.some((error) => error === null)) {
    return { success: false, error: "Invalid session event data" }
  }

  if (
    !Array.isArray(value.errorsEncountered) ||
    !value.errorsEncountered.every(
      (result) => typeof result === "string" && SCAN_RESULTS.has(result)
    )
  ) {
    return { success: false, error: "Invalid exception summary" }
  }

  if (value.errorCount !== errors.length) {
    return { success: false, error: "Error count does not match session errors" }
  }

  if (
    scanEvents.some((event) => event?.sessionId !== value.sessionId) ||
    errors.some((error) => error?.sessionId !== value.sessionId)
  ) {
    return { success: false, error: "Event session IDs do not match" }
  }

  const successfulScans = scanEvents.filter(
    (event) => event?.result === ScanResult.SUCCESS
  ).length
  const expectedTotalPicks = scanEvents.filter(
    (event) =>
      event?.step === WorkflowStep.PK_SCAN_TOTE_BARCODE &&
      event.result === ScanResult.SUCCESS
  ).length
  const expectedAccuracyScore =
    scanEvents.length > 0
      ? Math.round((successfulScans / scanEvents.length) * 100)
      : 0
  const elapsedHours = value.totalTimeMs / 3_600_000
  const actualPicksPerHour =
    elapsedHours > 0 ? value.totalPicks / elapsedHours : 0
  const expectedSpeedScore = Math.round(
    Math.min(
      actualPicksPerHour / (bundle.scenario.targetPicksPerHour ?? 150),
      1
    ) * 100
  )
  const expectedFinalScore = Math.round(
    expectedAccuracyScore * bundle.scenario.scoringWeights.accuracy +
      expectedSpeedScore * bundle.scenario.scoringWeights.speed
  )
  const expectedPassed =
    expectedFinalScore >= bundle.scenario.passCriteria.minScore
  const injectedErrors = errors.filter((error) => error?.injected)
  const expectedErrorsEncountered = injectedErrors.map(
    (error) => error?.errorType
  )
  const expectedExceptionsResolved = injectedErrors.filter(
    (error) => error?.corrected
  ).length

  if (
    value.accuracyScore !== expectedAccuracyScore ||
    value.totalPicks !== expectedTotalPicks ||
    value.speedScore !== expectedSpeedScore ||
    value.finalScore !== expectedFinalScore ||
    value.passed !== expectedPassed ||
    value.correctFirstScans !== successfulScans ||
    value.exceptionsResolved !== expectedExceptionsResolved ||
    value.errorsEncountered.length !== expectedErrorsEncountered.length ||
    value.errorsEncountered.some(
      (errorType, index) => errorType !== expectedErrorsEncountered[index]
    )
  ) {
    return { success: false, error: "Session metrics do not match event data" }
  }

  const canonicalEventError = validateCanonicalScanEvents(
    scanEvents as PersistedScanEvent[],
    errors as PersistedSimulationError[],
    bundle
  )
  if (canonicalEventError) {
    return { success: false, error: canonicalEventError }
  }

  const timingError = validateEventTiming(
    scanEvents as PersistedScanEvent[],
    value.totalTimeMs
  )
  if (timingError) {
    return { success: false, error: timingError }
  }

  return {
    success: true,
    bundle,
    data: {
      sessionId: value.sessionId,
      scenarioId: value.scenarioId,
      difficulty: value.difficulty as DifficultyLevel,
      finalScore: value.finalScore,
      accuracyScore: value.accuracyScore,
      speedScore: value.speedScore,
      passed: value.passed,
      totalPicks: value.totalPicks,
      correctFirstScans: value.correctFirstScans,
      errorCount: value.errorCount,
      durationSeconds: value.durationSeconds,
      totalTimeMs: value.totalTimeMs,
      errorsEncountered: value.errorsEncountered as ScanResult[],
      exceptionsResolved: value.exceptionsResolved,
      scanEvents: scanEvents as PersistedScanEvent[],
      errors: errors as PersistedSimulationError[],
    },
  }
}

/** Preserve historical progress while applying one completed attempt. */
export function getNextProgressState(
  existing: ExistingProgress | null,
  submission: Pick<
    SessionSubmission,
    "finalScore" | "passed" | "totalTimeMs"
  >,
  completedAt: Date
): NextProgressState {
  const wasCompleted = existing?.completed ?? false
  return {
    bestScore: Math.max(existing?.bestScore ?? 0, submission.finalScore),
    completed: wasCompleted || submission.passed,
    completedAt:
      existing?.completedAt ?? (submission.passed ? completedAt : null),
    timeSpentMs:
      (existing?.timeSpentMs ?? 0) + submission.totalTimeMs,
  }
}
