import { NextResponse } from "next/server"
import { getRoleFromSession } from "@/lib/auth/roles"
import { generateAuditExport } from "@/services/reporting-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedFacility = searchParams.get("facilityId")

    const session = await getRoleFromSession()

    // Enforce Tenant Isolation / BOLA Defense
    let effectiveFacilityId = "FAC-BBWD-01"

    if (session.userId && session.facilityId) {
      const isCrossFacilityAdmin =
        session.role === "WAREHOUSE_MGR" ||
        (session.role as string) === "SUPER_ADMIN" ||
        (session.role as string) === "REGIONAL_DIRECTOR"

      if (requestedFacility && requestedFacility !== session.facilityId) {
        if (!isCrossFacilityAdmin) {
          return NextResponse.json(
            { error: "Access Denied: BOLA violation. Cannot export foreign facility audit data." },
            { status: 403 }
          )
        }
        effectiveFacilityId = requestedFacility
      } else {
        effectiveFacilityId = session.facilityId
      }
    } else if (requestedFacility) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Authentication required to export audit data" },
          { status: 401 }
        )
      }
      effectiveFacilityId = requestedFacility
    }

    const csvData = await generateAuditExport(effectiveFacilityId)
    const filename = `KineticOS_C_Suite_Audit_${effectiveFacilityId}_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate audit CSV export", details: String(error) },
      { status: 500 }
    )
  }
}
