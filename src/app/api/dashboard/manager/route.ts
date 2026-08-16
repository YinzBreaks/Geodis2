/** GET /api/dashboard/manager - canonical single-facility Manager report. */

import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth/roles"
import { getManagerReport } from "@/services/reporting/manager-reporting"

export async function GET() {
  const auth = await requireRole("WAREHOUSE_MGR")
  if (!auth.authorized || !auth.facilityId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  return NextResponse.json(await getManagerReport(auth.facilityId))
}
