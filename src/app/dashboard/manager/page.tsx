/**
 * Warehouse Manager aggregate dashboard.
 * Metrics are calculated by the canonical reporting service.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { getManagerReport } from "@/services/reporting/manager-reporting"
import { getExecutiveSummary, getCohortRoster } from "@/services/reporting-service"
import { ManagerDashboardClient } from "./manager-client"

export default async function ManagerDashboardPage() {
  const auth = await requireRole("WAREHOUSE_MGR")
  if (!auth.authorized || !auth.userId || !auth.facilityId) {
    redirect("/unauthorized")
  }

  let managerName = "Site Operations Director"
  if (prisma && prisma.user) {
    try {
      const manager = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { name: true },
      })
      if (manager) managerName = manager.name
    } catch {
      // Fallback
    }
  }

  const [report, executiveSummary, cohortRoster] = await Promise.all([
    getManagerReport(auth.facilityId),
    getExecutiveSummary(auth.facilityId),
    getCohortRoster("ALL", auth.facilityId),
  ])

  return (
    <ManagerDashboardClient
      managerName={managerName}
      facilityId={auth.facilityId}
      kpis={report.kpis}
      weeklySignoffs={report.weeklySignoffs}
      exceptionFailureRates={report.exceptionFailureRates}
      executiveSummary={executiveSummary}
      initialCohort={cohortRoster}
    />
  )
}
