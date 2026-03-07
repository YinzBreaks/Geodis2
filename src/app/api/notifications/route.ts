/**
 * POST /api/notifications — Create a notification (Flag for Review)
 *
 * Auth: PICK_LEAD only.
 * Body: { traineeId: string, message: string, type: "FLAG_FOR_REVIEW" }
 * Creates a Notification for the supervisor at the trainee's facility.
 *
 * Per CLAUDE.md: All DB access via Prisma through API routes.
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"

/** Request body shape for the notification endpoint. */
interface NotificationRequestBody {
  traineeId: string
  message: string
  type: "FLAG_FOR_REVIEW"
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("PICK_LEAD")
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  let body: NotificationRequestBody
  try {
    body = (await request.json()) as NotificationRequestBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.traineeId || !body.message || body.type !== "FLAG_FOR_REVIEW") {
    return NextResponse.json(
      { error: "traineeId, message, and type='FLAG_FOR_REVIEW' are required" },
      { status: 400 }
    )
  }

  // Find trainee's facility and the supervisor there
  const trainee = await prisma.user.findUnique({
    where: { id: body.traineeId },
    select: { facilityId: true },
  })

  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 })
  }

  // Find a supervisor at the trainee's facility
  const supervisor = await prisma.user.findFirst({
    where: { facilityId: trainee.facilityId, role: "SUPERVISOR" },
    select: { id: true },
  })

  if (!supervisor) {
    return NextResponse.json(
      { error: "No supervisor found at trainee facility" },
      { status: 404 }
    )
  }

  const notification = await prisma.notification.create({
    data: {
      fromUserId: auth.userId,
      toUserId: supervisor.id,
      traineeId: body.traineeId,
      message: body.message,
      type: body.type,
    },
  })

  return NextResponse.json({ notification }, { status: 201 })
}
