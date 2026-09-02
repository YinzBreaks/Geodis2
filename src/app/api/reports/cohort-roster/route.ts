import { NextResponse } from "next/server"
import { getCohortRoster, type CohortFilter } from "@/services/reporting-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = (searchParams.get("filter")?.toUpperCase() as CohortFilter) ?? "ALL"
    const facilityId = searchParams.get("facilityId") ?? "FAC-BBWD-01"

    const roster = await getCohortRoster(filter, facilityId)
    return NextResponse.json({ roster, filter, facilityId, total: roster.length })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cohort roster", details: String(error) },
      { status: 500 }
    )
  }
}
