/**
 * gamification.test.ts — Unit tests for derived gamification stats
 *
 * Covers the scoring/streak/multiplier logic in computeGameStats and the
 * grade thresholds in gradeFromStats. Stats are pure derivations of a
 * SimulationSession, so tests build minimal sessions with synthetic
 * scanEvents.
 *
 * Per CLAUDE.md §Testing: all simulation state logic must have unit tests.
 */

import { describe, it, expect } from "vitest"
import { computeGameStats, gradeFromStats } from "@/lib/gamification"
import {
  ScanResult,
  WorkflowStep,
  ContentType,
  DifficultyLevel,
  Zone,
  type SimulationSession,
  type ScanEvent,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function makeScan(result: ScanResult, i: number): ScanEvent {
  return {
    scanEventId: `scan-${i}`,
    sessionId: "s1",
    step: WorkflowStep.PK_SCAN_ITEM_UPC,
    expectedValue: "X",
    scannedValue: "X",
    result,
    timestamp: new Date(),
    responseTimeMs: 1000,
  }
}

/** Build a session with the given scan results and pick/queue counts. */
function makeSession(
  results: ScanResult[],
  opts: { picksCompleted?: number; picksTotal?: number; startedMsAgo?: number } = {}
): SimulationSession {
  const { picksCompleted = 0, picksTotal = 9, startedMsAgo = 0 } = opts
  return {
    sessionId: "s1",
    userId: "u1",
    toteStack: [],
    moduleId: "m1",
    moduleType: ContentType.SIMULATION,
    difficulty: DifficultyLevel.BEGINNER,
    cart: {
      cartId: "c1",
      barcode: "C900001413",
      zone: Zone.Z1,
      totes: [],
      isBuilt: false,
    } as unknown as SimulationSession["cart"],
    pickQueue: Array.from({ length: picksTotal }, (_, i) => ({}) as never),
    completedPicks: Array.from({ length: picksCompleted }, (_, i) => ({}) as never),
    currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
    currentPickIndex: picksCompleted,
    currentToteSlot: 1,
    scanEvents: results.map(makeScan),
    errors: [],
    startedAt: new Date(Date.now() - startedMsAgo),
    status: "IN_PROGRESS",
  }
}

const S = ScanResult.SUCCESS
const W = ScanResult.WRONG_ITEM

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("computeGameStats — scoring", () => {
  it("awards +100 per first-attempt correct scan", () => {
    const stats = computeGameStats(makeSession([S, S, S]))
    expect(stats.score).toBe(300)
  })

  it("penalizes wrong scans (-50) but never goes negative", () => {
    const stats = computeGameStats(makeSession([W, W, W]))
    expect(stats.score).toBe(0)
  })

  it("nets correct and wrong scans", () => {
    // +100 +100 -50 = 150
    const stats = computeGameStats(makeSession([S, S, W]))
    expect(stats.score).toBe(150)
  })
})

describe("computeGameStats — streak", () => {
  it("counts consecutive correct scans", () => {
    const stats = computeGameStats(makeSession([S, S, S, S]))
    expect(stats.streak).toBe(4)
    expect(stats.bestStreak).toBe(4)
  })

  it("resets streak on a wrong scan but keeps bestStreak", () => {
    const stats = computeGameStats(makeSession([S, S, S, W, S]))
    expect(stats.streak).toBe(1)
    expect(stats.bestStreak).toBe(3)
  })

  it("opens a 1.5x multiplier window after a 10-streak", () => {
    // 10 correct → window opens; next 3 correct earn 150 each.
    const results = Array(13).fill(S)
    const stats = computeGameStats(makeSession(results))
    // 10×100 + 3×150 = 1000 + 450 = 1450
    expect(stats.score).toBe(1450)
    // window of 3 is consumed exactly
    expect(stats.multiplierActive).toBe(false)
  })

  it("flags multiplierActive while the window is still open", () => {
    const results = Array(11).fill(S) // 10 opens window, 11th consumes 1 of 3
    const stats = computeGameStats(makeSession(results))
    expect(stats.multiplierActive).toBe(true)
  })
})

describe("computeGameStats — accuracy & pace", () => {
  it("computes first-attempt accuracy", () => {
    const stats = computeGameStats(makeSession([S, S, W, S]))
    expect(stats.accuracy).toBeCloseTo(0.75)
  })

  it("reports accuracy 1 when no scans yet", () => {
    const stats = computeGameStats(makeSession([]))
    expect(stats.accuracy).toBe(1)
    expect(stats.totalScans).toBe(0)
  })

  it("extrapolates pace from elapsed time", () => {
    // 5 picks in 30 minutes → 10 picks/hour
    const stats = computeGameStats(
      makeSession([S], { picksCompleted: 5, startedMsAgo: 30 * 60 * 1000 })
    )
    expect(stats.pace).toBe(10)
  })
})

describe("gradeFromStats", () => {
  it("returns A for high accuracy and pace", () => {
    const grade = gradeFromStats(
      { accuracy: 1, pace: 100 } as never,
      100
    )
    expect(grade).toBe("A")
  })

  it("returns D for poor accuracy and pace", () => {
    const grade = gradeFromStats(
      { accuracy: 0.3, pace: 10 } as never,
      100
    )
    expect(grade).toBe("D")
  })
})
