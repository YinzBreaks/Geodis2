/**
 * floorReadiness.test.ts — Unit tests for floor-ready assessment algorithm
 *
 * Per CLAUDE.md §Testing: all state transitions and business rules must be tested.
 * Tests cover:
 *  ✓ All thresholds met → FLOOR_READY
 *  ✓ Missing ADVANCED pass → IN_PROGRESS with correct gap
 *  ✓ Exception resolution < 90% → NEEDS_COACHING with gap
 *  ✓ Not all 8 exception types seen → gap lists missing types
 *  ✓ Trend: improving / plateauing / declining correctly detected
 *  ✓ Empty sessions array → IN_PROGRESS, all gaps listed
 *  ✓ commonMistake populated from most frequent wrong step
 */

import { describe, it, expect } from "vitest"
import {
  assessFloorReadiness,
  getExceptionCoverage,
  getScoreTrend,
  getGaps,
  type SimSessionInput,
  type ModuleProgressInput,
} from "@/lib/floorReadiness"
import { ScanResult, DifficultyLevel } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURE FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<SimSessionInput> = {}): SimSessionInput {
  return {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: "sim-z1-20picks",
    difficulty: DifficultyLevel.INTERMEDIATE,
    status: "COMPLETED",
    finalScore: 85,
    accuracyScore: 90,
    passed: true,
    scanEvents: [],
    errors: [],
    completedAt: new Date("2026-03-01"),
    ...overrides,
  }
}

function makeProgress(overrides: Partial<ModuleProgressInput> = {}): ModuleProgressInput {
  return {
    moduleId: "sim-z1-20picks",
    completed: true,
    bestScore: 85,
    ...overrides,
  }
}

/**
 * Build a session with specific errors for exception coverage testing.
 * Each entry in errorDefs becomes a stored error with the given type and corrected status.
 */
function makeSessionWithErrors(
  errorDefs: Array<{ errorType: string; corrected: boolean; wrongSteps?: string[] }>,
  overrides: Partial<SimSessionInput> = {}
): SimSessionInput {
  const errors = errorDefs.map((def) => ({
    errorId: `err-${Math.random().toString(36).slice(2, 8)}`,
    sessionId: "test",
    step: "PK_SCAN_ITEM_UPC",
    errorType: def.errorType,
    injected: true,
    corrected: def.corrected,
    correctionSteps: def.wrongSteps ?? (def.corrected ? ["EX_PRESS_CTRL_W"] : []),
    occurredAt: new Date().toISOString(),
  }))

  return makeSession({ errors, ...overrides })
}

/** Build a full set of sessions that meets ALL floor-ready thresholds. */
function makeFloorReadySessions(): SimSessionInput[] {
  // All 8 exception types encountered and resolved
  const allErrors = [
    ScanResult.WRONG_ITEM,
    ScanResult.WRONG_TOTE,
    ScanResult.WRONG_LOCATION,
    ScanResult.TOTE_ALLOCATED,
    ScanResult.CART_ALLOCATED,
    ScanResult.ITEM_NOT_FOUND,
    ScanResult.ITEM_DAMAGED,
    ScanResult.TIMEOUT,
  ].map((errorType) => ({ errorType, corrected: true }))

  return [
    makeSessionWithErrors(allErrors.slice(0, 4), {
      finalScore: 80,
      accuracyScore: 85,
      passed: true,
      difficulty: DifficultyLevel.INTERMEDIATE,
      completedAt: new Date("2026-02-28"),
    }),
    makeSessionWithErrors(allErrors.slice(4), {
      finalScore: 82,
      accuracyScore: 88,
      passed: true,
      difficulty: DifficultyLevel.INTERMEDIATE,
      completedAt: new Date("2026-03-01"),
    }),
    makeSessionWithErrors(
      [
        { errorType: ScanResult.WRONG_ITEM, corrected: true },
        { errorType: ScanResult.ITEM_NOT_FOUND, corrected: true },
      ],
      {
        finalScore: 90,
        accuracyScore: 92,
        passed: true,
        difficulty: DifficultyLevel.ADVANCED,
        completedAt: new Date("2026-03-02"),
      }
    ),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// getScoreTrend
// ─────────────────────────────────────────────────────────────────────────────

describe("getScoreTrend", () => {
  it("returns 'improving' when last 3 scores each increase", () => {
    expect(getScoreTrend([60, 70, 75, 80])).toBe("improving")
  })

  it("returns 'declining' when last 3 scores each decrease", () => {
    expect(getScoreTrend([80, 75, 70, 60])).toBe("declining")
  })

  it("returns 'plateauing' when scores are mixed", () => {
    expect(getScoreTrend([70, 80, 75, 80])).toBe("plateauing")
  })

  it("returns 'plateauing' when scores are equal", () => {
    expect(getScoreTrend([75, 75, 75])).toBe("plateauing")
  })

  it("returns 'plateauing' with fewer than 3 scores", () => {
    expect(getScoreTrend([80, 85])).toBe("plateauing")
    expect(getScoreTrend([80])).toBe("plateauing")
    expect(getScoreTrend([])).toBe("plateauing")
  })

  it("only considers the last 3 scores", () => {
    // First scores are declining, but last 3 are improving
    expect(getScoreTrend([90, 80, 60, 65, 70])).toBe("improving")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getExceptionCoverage
// ─────────────────────────────────────────────────────────────────────────────

describe("getExceptionCoverage", () => {
  it("aggregates errors across multiple sessions", () => {
    const sessions = [
      makeSessionWithErrors([
        { errorType: ScanResult.WRONG_ITEM, corrected: true },
        { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
      ]),
      makeSessionWithErrors([
        { errorType: ScanResult.WRONG_ITEM, corrected: true },
      ]),
    ]

    const coverage = getExceptionCoverage(sessions)
    expect(coverage[ScanResult.WRONG_ITEM].encountered).toBe(3)
    expect(coverage[ScanResult.WRONG_ITEM].resolvedCorrectly).toBe(2)
    expect(coverage[ScanResult.WRONG_ITEM].resolutionRate).toBeCloseTo(2 / 3)
  })

  it("returns zero stats for unseen exception types", () => {
    const sessions = [
      makeSessionWithErrors([
        { errorType: ScanResult.WRONG_ITEM, corrected: true },
      ]),
    ]

    const coverage = getExceptionCoverage(sessions)
    expect(coverage[ScanResult.ITEM_DAMAGED].encountered).toBe(0)
    expect(coverage[ScanResult.ITEM_DAMAGED].resolutionRate).toBe(0)
  })

  it("populates commonMistake from most frequent wrong step", () => {
    const sessions = [
      makeSessionWithErrors([
        { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
        { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
        { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["EX_PRESS_CTRL_W"] },
      ]),
    ]

    const coverage = getExceptionCoverage(sessions)
    expect(coverage[ScanResult.WRONG_ITEM].commonMistake).toBe(
      "PK_SCAN_TOTE_BARCODE"
    )
  })

  it("handles empty sessions array", () => {
    const coverage = getExceptionCoverage([])
    for (const exType of Object.keys(coverage)) {
      expect(coverage[exType].encountered).toBe(0)
      expect(coverage[exType].resolutionRate).toBe(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getGaps
// ─────────────────────────────────────────────────────────────────────────────

describe("getGaps", () => {
  it("returns empty gaps when all thresholds met", () => {
    const sessions = makeFloorReadySessions()
    const progress = [makeProgress()]
    const gaps = getGaps(sessions, progress)
    expect(gaps).toHaveLength(0)
  })

  it("identifies missing ADVANCED pass", () => {
    const sessions = [
      makeSession({ difficulty: DifficultyLevel.INTERMEDIATE, passed: true, completedAt: new Date("2026-02-28") }),
      makeSession({ difficulty: DifficultyLevel.INTERMEDIATE, passed: true, completedAt: new Date("2026-03-01") }),
      makeSession({ difficulty: DifficultyLevel.INTERMEDIATE, passed: true, completedAt: new Date("2026-03-02") }),
    ]
    // Give all 8 exception types encountered and resolved
    const allErrors = [
      ScanResult.WRONG_ITEM, ScanResult.WRONG_TOTE, ScanResult.WRONG_LOCATION,
      ScanResult.TOTE_ALLOCATED, ScanResult.CART_ALLOCATED, ScanResult.ITEM_NOT_FOUND,
      ScanResult.ITEM_DAMAGED, ScanResult.TIMEOUT,
    ].map((errorType) => ({ errorType, corrected: true }))
    sessions[0] = makeSessionWithErrors(allErrors, {
      ...sessions[0],
    })

    const gaps = getGaps(sessions, [])
    const advancedGap = gaps.find((g) => g.criterion.includes("ADVANCED"))
    expect(advancedGap).toBeDefined()
    expect(advancedGap!.current).toBe("None")
  })

  it("identifies low exception resolution rate", () => {
    const sessions = [
      makeSessionWithErrors(
        [
          { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
          { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
          { errorType: ScanResult.WRONG_ITEM, corrected: true },
        ],
        {
          difficulty: DifficultyLevel.ADVANCED,
          passed: true,
          finalScore: 85,
          accuracyScore: 90,
          completedAt: new Date("2026-03-02"),
        }
      ),
      makeSession({ passed: true, completedAt: new Date("2026-03-01") }),
      makeSession({ passed: true, completedAt: new Date("2026-02-28") }),
    ]

    const gaps = getGaps(sessions, [])
    const rateGap = gaps.find((g) =>
      g.criterion.includes("resolution rate")
    )
    expect(rateGap).toBeDefined()
  })

  it("identifies missing exception types", () => {
    // Only encounter 2 of 8 exception types
    const sessions = [
      makeSessionWithErrors(
        [
          { errorType: ScanResult.WRONG_ITEM, corrected: true },
          { errorType: ScanResult.WRONG_TOTE, corrected: true },
        ],
        {
          difficulty: DifficultyLevel.ADVANCED,
          passed: true,
          finalScore: 85,
          accuracyScore: 90,
          completedAt: new Date("2026-03-02"),
        }
      ),
      makeSession({ passed: true, completedAt: new Date("2026-03-01") }),
      makeSession({ passed: true, completedAt: new Date("2026-02-28") }),
    ]

    const gaps = getGaps(sessions, [])
    const missingGap = gaps.find((g) =>
      g.criterion.includes("Not all 8")
    )
    expect(missingGap).toBeDefined()
    expect(missingGap!.current).toContain("Missing:")
    // Should list 6 missing types
    expect(missingGap!.current).toContain("Incorrect Location")
    expect(missingGap!.current).toContain("Short Inventory")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// assessFloorReadiness
// ─────────────────────────────────────────────────────────────────────────────

describe("assessFloorReadiness", () => {
  it("returns FLOOR_READY when all thresholds met", () => {
    const sessions = makeFloorReadySessions()
    const progress = [makeProgress()]

    const report = assessFloorReadiness(sessions, progress)
    expect(report.status).toBe("FLOOR_READY")
    expect(report.gaps).toHaveLength(0)
    expect(report.suggestedAt).toBeDefined()
    expect(report.scoreHistory.length).toBeGreaterThanOrEqual(3)
  })

  it("returns IN_PROGRESS with correct gap when missing ADVANCED pass", () => {
    // 3 passed intermediate sessions with all exception types
    const allErrors = [
      ScanResult.WRONG_ITEM, ScanResult.WRONG_TOTE, ScanResult.WRONG_LOCATION,
      ScanResult.TOTE_ALLOCATED, ScanResult.CART_ALLOCATED, ScanResult.ITEM_NOT_FOUND,
      ScanResult.ITEM_DAMAGED, ScanResult.TIMEOUT,
    ].map((et) => ({ errorType: et, corrected: true }))

    const sessions = [
      makeSessionWithErrors(allErrors, {
        difficulty: DifficultyLevel.INTERMEDIATE,
        passed: true,
        finalScore: 80,
        accuracyScore: 85,
        completedAt: new Date("2026-02-28"),
      }),
      makeSession({
        difficulty: DifficultyLevel.INTERMEDIATE,
        passed: true,
        finalScore: 82,
        accuracyScore: 88,
        completedAt: new Date("2026-03-01"),
      }),
      makeSession({
        difficulty: DifficultyLevel.INTERMEDIATE,
        passed: true,
        finalScore: 85,
        accuracyScore: 90,
        completedAt: new Date("2026-03-02"),
      }),
    ]

    const report = assessFloorReadiness(sessions, [])
    expect(report.status).toBe("IN_PROGRESS")
    expect(report.gaps.some((g) => g.criterion.includes("ADVANCED"))).toBe(true)
  })

  it("returns NEEDS_COACHING when exception resolution rate is below 90%", () => {
    const sessions = [
      makeSessionWithErrors(
        [
          { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
          { errorType: ScanResult.WRONG_ITEM, corrected: false, wrongSteps: ["PK_SCAN_TOTE_BARCODE"] },
          { errorType: ScanResult.WRONG_ITEM, corrected: true },
        ],
        {
          difficulty: DifficultyLevel.ADVANCED,
          finalScore: 60,
          accuracyScore: 65,
          passed: false,
          completedAt: new Date("2026-03-02"),
        }
      ),
      makeSession({
        finalScore: 55,
        accuracyScore: 60,
        passed: false,
        completedAt: new Date("2026-03-01"),
      }),
      makeSession({
        finalScore: 50,
        accuracyScore: 55,
        passed: false,
        completedAt: new Date("2026-02-28"),
      }),
    ]

    const report = assessFloorReadiness(sessions, [])
    expect(report.status).toBe("NEEDS_COACHING")
    expect(report.gaps.length).toBeGreaterThan(0)
  })

  it("returns IN_PROGRESS with all gaps listed for empty sessions", () => {
    const report = assessFloorReadiness([], [])
    expect(report.status).toBe("IN_PROGRESS")
    expect(report.gaps.length).toBeGreaterThan(0)
    expect(report.scoreHistory).toHaveLength(0)
    expect(report.trend).toBe("plateauing")

    // Should have gaps for: final score, accuracy, simulations completed,
    // advanced pass, exception types
    const criteria = report.gaps.map((g) => g.criterion)
    expect(criteria.some((c) => c.includes("Final score"))).toBe(true)
    expect(criteria.some((c) => c.includes("Accuracy"))).toBe(true)
    expect(criteria.some((c) => c.includes("passed simulations"))).toBe(true)
    expect(criteria.some((c) => c.includes("ADVANCED"))).toBe(true)
    expect(criteria.some((c) => c.includes("exception types"))).toBe(true)
  })

  it("populates exceptionCoverage with all 8 types", () => {
    const sessions = makeFloorReadySessions()
    const report = assessFloorReadiness(sessions, [])

    expect(Object.keys(report.exceptionCoverage)).toHaveLength(8)
    expect(report.exceptionCoverage[ScanResult.WRONG_ITEM]).toBeDefined()
    expect(report.exceptionCoverage[ScanResult.TIMEOUT]).toBeDefined()
  })

  it("computes correct trend in report", () => {
    const sessions = [
      makeSession({ finalScore: 60, completedAt: new Date("2026-02-28") }),
      makeSession({ finalScore: 70, completedAt: new Date("2026-03-01") }),
      makeSession({ finalScore: 80, completedAt: new Date("2026-03-02") }),
    ]

    const report = assessFloorReadiness(sessions, [])
    expect(report.trend).toBe("improving")
    expect(report.scoreHistory).toEqual([60, 70, 80])
  })

  it("detects declining trend", () => {
    const sessions = [
      makeSession({ finalScore: 80, completedAt: new Date("2026-02-28") }),
      makeSession({ finalScore: 70, completedAt: new Date("2026-03-01") }),
      makeSession({ finalScore: 60, completedAt: new Date("2026-03-02") }),
    ]

    const report = assessFloorReadiness(sessions, [])
    expect(report.trend).toBe("declining")
  })
})
