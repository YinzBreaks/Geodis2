import { NextResponse } from "next/server"
import { generateAuditExport } from "@/services/reporting-service"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const facilityId = searchParams.get("facilityId") ?? "FAC-BBWD-01"

    const csvData = await generateAuditExport(facilityId)
    const filename = `KineticOS_C_Suite_Audit_${facilityId}_${new Date().toISOString().slice(0, 10)}.csv`

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate audit CSV export", details: String(error) },
      { status: 500 }
    )
  }
}
