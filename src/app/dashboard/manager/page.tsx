/**
 * Warehouse Manager aggregate dashboard.
 * Metrics are calculated by the canonical reporting service.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { getManagerReport } from "@/services/reporting/manager-reporting"
import { ManagerDashboardClient } from "./manager-client"

export default async function ManagerDashboardPage() {
  const auth = await requireRole("WAREHOUSE_MGR")
  if (!auth.authorized || !auth.userId || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const manager = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true },
  })
  if (!manager) {
    redirect("/unauthorized")
  }

  const report = await getManagerReport(auth.facilityId)

  return (
    <ManagerDashboardClient
      managerName={manager.name}
      facilityId={auth.facilityId}
      kpis={report.kpis}
      weeklySignoffs={report.weeklySignoffs}
      exceptionFailureRates={report.exceptionFailureRates}
    />
  )
}
