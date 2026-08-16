import { describe, expect, it } from "vitest"
import { buildCohortReport } from "@/services/reporting/cohort-reporting"

function record() {
  return {
    id: "trainee-1",
    name: "Taylor Trainee",
    employeeId: "EMP-100",
    startDate: new Date("2026-08-01T00:00:00.000Z"),
    sessions: [
      {
        id: "session-1",
        moduleId: "sim-z1-20picks",
        difficulty: "INTERMEDIATE",
        status: "COMPLETED",
        finalScore: 80,
        accuracyScore: 85,
        passed: true,
        scanEvents: [],
        errors: [
          {
            errorType: "WRONG_TOTE",
            injected: true,
            corrected: true,
            correctionSteps: ["EX_PRESS_CTRL_W"],
          },
        ],
        startedAt: new Date("2026-08-16T11:00:00.000Z"),
        completedAt: new Date("2026-08-16T12:00:00.000Z"),
      },
    ],
    moduleProgress: [
      { moduleId: "sim-z1-20picks", completed: true, bestScore: 80 },
    ],
    hasSignoff: true,
  }
}

describe("buildCohortReport", () => {
  it("builds one canonical trainee summary and daily trend", () => {
    const report = buildCohortReport(
      [record()],
      new Date("2026-08-16T18:00:00.000Z")
    )

    expect(report.trainees[0]).toEqual(
      expect.objectContaining({
        userId: "trainee-1",
        name: "Taylor Trainee",
        bestScore: 80,
        sessionsCompleted: 1,
        sessionsRequired: 3,
        lastActive: "2026-08-16T11:00:00.000Z",
        hasSignoff: true,
      })
    )

    const today = report.trendData[report.trendData.length - 1]
    expect(today).toEqual({
      date: "Aug 16",
      avgScore: 80,
      passRate: 100,
      avgAccuracy: 85,
    })
    expect(report.cohortExceptionCoverage.WRONG_TOTE).toEqual(
      expect.objectContaining({
        encountered: 1,
        resolvedCorrectly: 1,
        resolutionRate: 1,
      })
    )
  })

  it("returns stable empty cohort data", () => {
    const report = buildCohortReport(
      [],
      new Date("2026-08-16T18:00:00.000Z")
    )

    expect(report.trainees).toEqual([])
    expect(report.trendData).toHaveLength(28)
    expect(report.trendData.every((point) => point.avgScore === 0)).toBe(true)
    expect(
      Object.values(report.cohortExceptionCoverage).every(
        (stats) => stats.encountered === 0
      )
    ).toBe(true)
  })
})
