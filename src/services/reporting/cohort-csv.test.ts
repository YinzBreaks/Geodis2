import { describe, expect, it } from "vitest"
import { buildCohortCsv } from "@/services/reporting/cohort-csv"
import type { CohortTraineeOverview } from "@/services/reporting/cohort-reporting"

function trainee(
  overrides: Partial<CohortTraineeOverview> = {}
): CohortTraineeOverview {
  return {
    userId: "trainee-1",
    name: "Taylor Trainee",
    employeeId: "EMP-100",
    startDate: "2026-08-01T00:00:00.000Z",
    bestScore: 82,
    sessionsCompleted: 3,
    sessionsRequired: 3,
    lastActive: "2026-08-15T12:00:00.000Z",
    report: {
      status: "FLOOR_READY",
      gaps: [],
      exceptionCoverage: {},
      scoreHistory: [75, 80, 82],
      trend: "improving",
    },
    hasSignoff: true,
    ...overrides,
  }
}

describe("buildCohortCsv", () => {
  it("filters by readiness status and search", () => {
    const csv = buildCohortCsv(
      [
        trainee(),
        trainee({
          userId: "trainee-2",
          name: "Jordan Learner",
          employeeId: "EMP-200",
          report: { ...trainee().report, status: "IN_PROGRESS" },
        }),
      ],
      { status: "FLOOR_READY", search: "EMP-100" },
      new Date("2026-08-16T00:00:00.000Z")
    )

    expect(csv).toContain("Taylor Trainee")
    expect(csv).not.toContain("Jordan Learner")
  })

  it("neutralizes spreadsheet formulas", () => {
    const csv = buildCohortCsv(
      [trainee({ name: "=HYPERLINK(\"bad\")" })],
      {},
      new Date("2026-08-16T00:00:00.000Z")
    )

    expect(csv).toContain("'=HYPERLINK")
    expect(csv).not.toContain('\"=HYPERLINK')
  })
})
