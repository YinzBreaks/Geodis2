import { NextResponse } from "next/server"
import { getRoleFromSession } from "@/lib/auth/roles"
import { getCohortRoster, type CohortFilter } from "@/services/reporting-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get("filter")?.toUpperCase() as CohortFilter) ?? "ALL"
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
            { error: "Access Denied: BOLA violation. Cannot access foreign cohort roster." },
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
          { error: "Authentication required to query cohort roster" },
          { status: 401 }
        )
      }
      effectiveFacilityId = requestedFacility
    }

    const roster = await getCohortRoster(filter, effectiveFacilityId)
    return NextResponse.json({ roster, filter, facilityId: effectiveFacilityId, total: roster.length })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cohort roster", details: String(error) },
      { status: 500 }
    )
  }
}
