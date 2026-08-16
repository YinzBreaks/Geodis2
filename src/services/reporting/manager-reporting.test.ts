import { describe, expect, it } from "vitest"
import { buildManagerReport } from "@/services/reporting/manager-reporting"
import type { SimSessionInput } from "@/lib/floorReadiness"

function session(
  id: string,
  finalScore: number,
  errors: unknown[] = []
): SimSessionInput {
  return {
    id,
    moduleId: "sim-z1-20picks",
    difficulty: "INTERMEDIATE",
    status: "COMPLETED",
    finalScore,
    accuracyScore: finalScore,
    passed: true,
    scanEvents: [],
    errors,
    completedAt: new Date("2026-08-15T12:00:00.000Z"),
  }
}

describe("buildManagerReport", () => {
  it("uses canonical units and persisted error resolution", () => {
    const report = buildManagerReport({
      totalTrainees: 4,
      activeTrainees: 2,
      recentSessions: [
        session("session-1", 80, [
          {
            errorType: "WRONG_ITEM",
            injected: true,
            corrected: true,
            correctionSteps: ["EX_NOTIFY_LEAD"],
          },
        ]),
        session("session-2", 100, [
          {
            errorType: "WRONG_ITEM",
            injected: true,
            corrected: false,
            correctionSteps: [],
          },
        ]),
      ],
      signoffs: [
        {
          confirmedAt: new Date("2026-08-11T00:00:00.000Z"),
          traineeStartDate: new Date("2026-08-01T00:00:00.000Z"),
        },
        {
          confirmedAt: new Date("2026-08-16T00:00:00.000Z"),
          traineeStartDate: new Date("2026-07-27T00:00:00.000Z"),
        },
      ],
      now: new Date("2026-08-16T12:00:00.000Z"),
    })

    expect(report.kpis).toEqual({
      activeTrainees: 2,
      avgFinalScore: 90,
      floorReadyRate: 50,
      avgDaysToReady: 15,
    })
    expect(
      report.weeklySignoffs.reduce((sum, week) => sum + week.count, 0)
    ).toBe(2)
    expect(
      report.exceptionFailureRates.find(
        (entry) => entry.exceptionType === "WRONG_ITEM"
      )
    ).toEqual({
      exceptionType: "WRONG_ITEM",
      label: "Invalid Item",
      failureRate: 0.5,
      totalEncountered: 2,
    })
  })

  it("returns stable zero-state metrics", () => {
    const report = buildManagerReport({
      totalTrainees: 0,
      activeTrainees: 0,
      recentSessions: [],
      signoffs: [],
      now: new Date("2026-08-16T12:00:00.000Z"),
    })

    expect(report.kpis).toEqual({
      activeTrainees: 0,
      avgFinalScore: 0,
      floorReadyRate: 0,
      avgDaysToReady: null,
    })
    expect(report.weeklySignoffs).toHaveLength(8)
    expect(
      report.exceptionFailureRates.every(
        (entry) => entry.failureRate === 0 && entry.totalEncountered === 0
      )
    ).toBe(true)
  })
})
