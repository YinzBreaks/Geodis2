import { describe, expect, it } from "vitest"
import { DifficultyLevel, ScanResult, WorkflowStep } from "@/types/domain"
import {
  getNextProgressState,
  parseSessionSubmission,
} from "@/services/session-persistence"

function validSubmission(): Record<string, unknown> {
  const sessionId = "session-test-001"
  const itemUpcs = [
    "024505572001",
    "031200000027",
    "012345678905",
    "071050030052",
    "041333040109",
    "052000002107",
    "063200012349",
    "074300010041",
    "085000009008",
    "096100025003",
  ]
  return {
    sessionId,
    scenarioId: "sim-z1-10picks",
    difficulty: DifficultyLevel.BEGINNER,
    finalScore: 92,
    accuracyScore: 100,
    speedScore: 80,
    passed: true,
    totalPicks: 10,
    correctFirstScans: 31,
    errorCount: 0,
    durationSeconds: 300,
    totalTimeMs: 300_000,
    errorsEncountered: [],
    exceptionsResolved: 0,
    scanEvents: [
      {
        scanEventId: "scan-zone",
        sessionId,
        step: WorkflowStep.BC_SCAN_ZONE_TASK_GROUP,
        expectedValue: "Z1",
        scannedValue: "Z1",
        result: ScanResult.SUCCESS,
        timestamp: "2026-08-16T12:00:00.000Z",
        responseTimeMs: 250,
      },
      {
        scanEventId: "scan-cart",
        sessionId,
        step: WorkflowStep.BC_SCAN_CART_BARCODE,
        expectedValue: "C000000084",
        scannedValue: "C000000084",
        result: ScanResult.SUCCESS,
        timestamp: "2026-08-16T12:00:01.000Z",
        responseTimeMs: 250,
      },
      ...Array.from({ length: 9 }, (_, index) => ({
        scanEventId: `scan-build-tote-${index + 1}`,
        sessionId,
        step: WorkflowStep.BC_SCAN_TOTE_BARCODE,
        expectedValue: `T${String(11701 + index).padStart(14, "0")}`,
        scannedValue: `T${String(11701 + index).padStart(14, "0")}`,
        result: ScanResult.SUCCESS,
        timestamp: `2026-08-16T12:00:${String(index + 2).padStart(2, "0")}.000Z`,
        responseTimeMs: 250,
      })),
      ...Array.from({ length: 10 }, (_, index) => [
        {
          scanEventId: `scan-item-${index + 1}`,
          sessionId,
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: itemUpcs[index],
          scannedValue: itemUpcs[index],
          result: ScanResult.SUCCESS,
          timestamp: `2026-08-16T12:00:${String(index * 2 + 11).padStart(2, "0")}.000Z`,
          responseTimeMs: 250,
        },
        {
          scanEventId: `scan-pick-tote-${index + 1}`,
          sessionId,
          step: WorkflowStep.PK_SCAN_TOTE_BARCODE,
          expectedValue: `T${String(11701 + (index % 9)).padStart(14, "0")}`,
          scannedValue: `T${String(11701 + (index % 9)).padStart(14, "0")}`,
          result: ScanResult.SUCCESS,
          timestamp: `2026-08-16T12:00:${String(index * 2 + 12).padStart(2, "0")}.000Z`,
          responseTimeMs: 250,
        },
      ]).flat(),
    ],
    errors: [],
  }
}

describe("parseSessionSubmission", () => {
  it("accepts a complete submission matching a canonical scenario", () => {
    const result = parseSessionSubmission(validSubmission())

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.bundle.scenario.moduleId).toBe("sim-z1-10picks")
      expect(result.data.scanEvents).toHaveLength(31)
    }
  })

  it("rejects an unknown scenario", () => {
    const submission = validSubmission()
    submission.scenarioId = "sim-forged"

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Unknown simulation scenario",
    })
  })

  it("rejects a final score that does not match scoring weights", () => {
    const submission = validSubmission()
    submission.finalScore = 99

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Session metrics do not match event data",
    })
  })

  it("rejects events belonging to another session", () => {
    const submission = validSubmission()
    submission.scanEvents = [
      {
        ...(submission.scanEvents as Array<Record<string, unknown>>)[0],
        sessionId: "session-other",
      },
    ]

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Event session IDs do not match",
    })
  })

  it("rejects a fabricated successful canonical scan", () => {
    const submission = validSubmission()
    const events = submission.scanEvents as Array<Record<string, unknown>>
    events[1] = { ...events[1], scannedValue: "C999999999" }

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Successful scan does not match scenario at BC_SCAN_CART_BARCODE",
    })
  })

  it("rejects an error count that disagrees with persisted errors", () => {
    const submission = validSubmission()
    submission.errorCount = 1

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Error count does not match session errors",
    })
  })

  it("rejects scan events with non-chronological timestamps", () => {
    const submission = validSubmission()
    const events = submission.scanEvents as Array<Record<string, unknown>>
    events[1] = { ...events[1], timestamp: "2026-08-16T11:59:00.000Z" }

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Scan event timestamps are not in chronological order",
    })
  })

  it("rejects a spoofed session duration shorter than the event span", () => {
    const submission = validSubmission()
    // Claim a 10-second session while the recorded events span 30 seconds.
    // The other metrics are adjusted to stay internally consistent so the
    // timing check is the one that fires (10s for 10 picks → speed 100).
    submission.totalTimeMs = 10_000
    submission.durationSeconds = 10
    submission.speedScore = 100
    submission.finalScore = 100

    expect(parseSessionSubmission(submission)).toEqual({
      success: false,
      error: "Session duration is shorter than the recorded scan events",
    })
  })
})

describe("getNextProgressState", () => {
  it("does not reduce an existing best score", () => {
    const completedAt = new Date("2026-08-16T12:00:00.000Z")
    const originalCompletedAt = new Date("2026-08-01T12:00:00.000Z")

    const next = getNextProgressState(
      {
        bestScore: 92,
        completed: true,
        completedAt: originalCompletedAt,
        timeSpentMs: 120_000,
      },
      { finalScore: 76, passed: true, totalTimeMs: 300_000 },
      completedAt
    )

    expect(next.bestScore).toBe(92)
    expect(next.completed).toBe(true)
    expect(next.completedAt).toBe(originalCompletedAt)
    expect(next.timeSpentMs).toBe(420_000)
  })

  it("sets sticky completion on the first passing attempt", () => {
    const completedAt = new Date("2026-08-16T12:00:00.000Z")

    const next = getNextProgressState(
      {
        bestScore: 60,
        completed: false,
        completedAt: null,
        timeSpentMs: 60_000,
      },
      { finalScore: 76, passed: true, totalTimeMs: 120_000 },
      completedAt
    )

    expect(next).toEqual({
      bestScore: 76,
      completed: true,
      completedAt,
      timeSpentMs: 180_000,
    })
  })
})
