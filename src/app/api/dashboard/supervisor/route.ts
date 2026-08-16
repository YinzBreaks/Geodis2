/** GET /api/dashboard/supervisor - canonical facility cohort report. */

import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/roles"
import { getCohortReport } from "@/services/reporting/cohort-reporting"

export async function GET() {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  return NextResponse.json(
    await getCohortReport({ facilityId: auth.facilityId })
  )
}
