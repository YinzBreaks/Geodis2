/**
 * POST /api/signoff — Create a floor-ready signoff record
 *
 * Auth: SUPERVISOR only.
 * Body: { traineeId: string, notes?: string }
 * Creates FloorReadySignoff with a snapshot of FLOOR_READY_THRESHOLDS.
 *
 * Per CLAUDE.md: floor-ready is never automatic — supervisor always clicks to confirm.
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"

/** Request body shape for the signoff endpoint. */
interface SignoffRequestBody {
  traineeId: string
  notes?: string
}

export async function POST(request: NextRequest) {
  // Auth check: SUPERVISOR only
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.userId || !auth.facilityId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  // Parse body
  let body: SignoffRequestBody
  try {
    body = (await request.json()) as SignoffRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.traineeId) {
    return NextResponse.json(
      { error: "traineeId is required" },
      { status: 400 }
    )
  }

  // Verify trainee exists and is at the same facility
  const trainee = await prisma.user.findUnique({
    where: { id: body.traineeId },
    select: { id: true, facilityId: true },
  })

  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 })
  }

  if (trainee.facilityId !== auth.facilityId) {
    return NextResponse.json(
      { error: "Trainee not at your facility" },
      { status: 403 }
    )
  }

  // Check for existing signoff
  const existing = await prisma.floorReadySignoff.findFirst({
    where: { traineeId: body.traineeId, status: "CONFIRMED" },
  })

  if (existing) {
    return NextResponse.json(
      { error: "Trainee already has a floor-ready signoff" },
      { status: 409 }
    )
  }

  // Create signoff with threshold snapshot
  const signoff = await prisma.floorReadySignoff.create({
    data: {
      traineeId: body.traineeId,
      supervisorId: auth.userId,
      facilityId: auth.facilityId,
      status: "CONFIRMED",
      notes: body.notes ?? null,
      thresholdSnapshot: JSON.parse(JSON.stringify(FLOOR_READY_THRESHOLDS)),
    },
  })

  return NextResponse.json({ signoff }, { status: 201 })
}
