/** Pick Lead dashboard backed by assigned-trainee cohort reporting. */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { getCohortReport } from "@/services/reporting/cohort-reporting"
import { LeadDashboardClient } from "./lead-client"

export default async function LeadDashboardPage() {
  const auth = await requireRole("PICK_LEAD")
  if (!auth.authorized || !auth.userId || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const lead = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { name: true },
  })
  if (!lead) {
    redirect("/unauthorized")
  }

  const report = await getCohortReport({
    facilityId: auth.facilityId,
    traineeIds: auth.assignedTrainees,
  })

  return (
    <LeadDashboardClient
      leadName={lead.name}
      trainees={report.trainees}
      cohortExceptionCoverage={report.cohortExceptionCoverage}
    />
  )
}
