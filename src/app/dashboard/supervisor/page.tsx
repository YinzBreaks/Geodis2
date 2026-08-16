/** Supervisor dashboard backed by canonical cohort reporting. */

import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/roles"
import { getCohortReport } from "@/services/reporting/cohort-reporting"
import { getCoachingFlagSummaries } from "@/services/reporting/coaching-flag-reporting"
import { SupervisorDashboardClient } from "./supervisor-client"

export default async function SupervisorDashboardPage() {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const [report, coachingFlags] = await Promise.all([
    getCohortReport({ facilityId: auth.facilityId }),
    getCoachingFlagSummaries({
      facilityId: auth.facilityId,
      status: "OPEN",
    }),
  ])

  return (
    <SupervisorDashboardClient
      trainees={report.trainees}
      cohortExceptionCoverage={report.cohortExceptionCoverage}
      trendData={report.trendData}
      initialCoachingFlags={coachingFlags}
    />
  )
}
