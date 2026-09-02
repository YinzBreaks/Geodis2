import { NextResponse } from "next/server"
import { getRoleFromSession } from "@/lib/auth/roles"
import { getExecutiveSummary } from "@/services/reporting-service"

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
            { error: "Access Denied: BOLA violation. Cannot access foreign facility telemetry." },
            { status: 403 }
          )
        }
        effectiveFacilityId = requestedFacility
      } else {
        effectiveFacilityId = session.facilityId
      }
    } else if (requestedFacility) {
      // In production, unauthenticated requests cannot query arbitrary facilities
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Authentication required to query facility telemetry" },
          { status: 401 }
        )
      }
      effectiveFacilityId = requestedFacility
    }

    const summary = await getExecutiveSummary(effectiveFacilityId)
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate executive summary report", details: String(error) },
      { status: 500 }
    )
  }
}
