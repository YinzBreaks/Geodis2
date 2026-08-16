import type { CohortTraineeOverview } from "@/services/reporting/cohort-reporting"
import type { FloorReadyStatus } from "@/lib/floorReadiness"

export interface CohortCsvFilters {
  status?: FloorReadyStatus
  search?: string
}

const HEADERS = [
  "Employee ID",
  "Name",
  "Readiness Status",
  "Confirmed Floor Ready",
  "Best Score",
  "Completed Sessions",
  "Last Active",
  "Days In Training",
  "Readiness Gaps",
]

function safeCell(value: string | number | boolean): string {
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

/** Filter cohort rows and produce spreadsheet-safe CSV. */
export function buildCohortCsv(
  trainees: CohortTraineeOverview[],
  filters: CohortCsvFilters,
  now = new Date()
): string {
  const search = filters.search?.trim().toLocaleLowerCase() ?? ""
  const rows = trainees.filter((trainee) => {
    if (filters.status && trainee.report.status !== filters.status) return false
    if (
      search &&
      !trainee.name.toLocaleLowerCase().includes(search) &&
      !trainee.employeeId.toLocaleLowerCase().includes(search)
    ) {
      return false
    }
    return true
  })

  const lines = [HEADERS.map(safeCell).join(",")]
  for (const trainee of rows) {
    const daysInTraining = Math.max(
      Math.ceil(
        (now.getTime() - new Date(trainee.startDate).getTime()) / 86_400_000
      ),
      0
    )
    lines.push(
      [
        trainee.employeeId,
        trainee.name,
        trainee.report.status,
        trainee.hasSignoff,
        trainee.bestScore,
        trainee.sessionsCompleted,
        trainee.lastActive ?? "",
        daysInTraining,
        trainee.report.gaps.map((gap) => gap.criterion).join("; "),
      ]
        .map(safeCell)
        .join(",")
    )
  }

  return `${lines.join("\r\n")}\r\n`
}
