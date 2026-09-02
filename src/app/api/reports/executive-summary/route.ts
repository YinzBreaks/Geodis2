import { NextResponse } from "next/server"
import { getExecutiveSummary } from "@/services/reporting-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const facilityId = searchParams.get("facilityId") ?? "FAC-BBWD-01"

    const summary = await getExecutiveSummary(facilityId)
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate executive summary report", details: String(error) },
      { status: 500 }
    )
  }
}
