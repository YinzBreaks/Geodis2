import type { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth/roles"
import { getCohortReport } from "@/services/reporting/cohort-reporting"
import { buildCohortCsv } from "@/services/reporting/cohort-csv"
import type { FloorReadyStatus } from "@/lib/floorReadiness"

const STATUSES = new Set<FloorReadyStatus>([
  "FLOOR_READY",
  "IN_PROGRESS",
  "NEEDS_COACHING",
])

export async function GET(request: NextRequest) {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    return Response.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  const requestedStatus = request.nextUrl.searchParams.get("status")
  const status =
    requestedStatus && STATUSES.has(requestedStatus as FloorReadyStatus)
      ? (requestedStatus as FloorReadyStatus)
      : undefined
  const search = request.nextUrl.searchParams.get("search") ?? undefined
  const report = await getCohortReport({ facilityId: auth.facilityId })
  const csv = buildCohortCsv(report.trainees, { status, search })
  const date = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="warehousepro-readiness-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
