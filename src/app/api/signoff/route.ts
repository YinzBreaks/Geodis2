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
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"
import {
  assessFloorReadiness,
  type ModuleProgressInput,
  type SimSessionInput,
} from "@/lib/floorReadiness"

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

  if (
    !body ||
    typeof body.traineeId !== "string" ||
    body.traineeId.trim().length === 0 ||
    (body.notes !== undefined &&
      (typeof body.notes !== "string" || body.notes.length > 2000))
  ) {
    return NextResponse.json(
      { error: "Invalid traineeId or notes" },
      { status: 400 }
    )
  }

  // Verify trainee role/facility and load the evidence used for signoff.
  const trainee = await prisma.user.findUnique({
    where: { id: body.traineeId },
    select: {
      id: true,
      facilityId: true,
      role: true,
      sessions: {
        select: {
          id: true,
          moduleId: true,
          difficulty: true,
          status: true,
          finalScore: true,
          accuracyScore: true,
          passed: true,
          scanEvents: true,
          errors: true,
          completedAt: true,
        },
      },
      moduleProgress: {
        select: {
          moduleId: true,
          completed: true,
          bestScore: true,
        },
      },
    },
  })

  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 })
  }

  if (trainee.facilityId !== auth.facilityId || trainee.role !== "TRAINEE") {
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


  const sessions: SimSessionInput[] = trainee.sessions.map((session) => ({
    id: session.id,
    moduleId: session.moduleId,
    difficulty: session.difficulty,
    status: session.status,
    finalScore: session.finalScore,
    accuracyScore: session.accuracyScore,
    passed: session.passed,
    scanEvents: session.scanEvents,
    errors: session.errors,
    completedAt: session.completedAt,
  }))
  const progress: ModuleProgressInput[] = trainee.moduleProgress.map(
    (moduleProgress) => ({
      moduleId: moduleProgress.moduleId,
      completed: moduleProgress.completed,
      bestScore: moduleProgress.bestScore,
    })
  )
  const readiness = assessFloorReadiness(sessions, progress)

  if (readiness.status !== "FLOOR_READY") {
    return NextResponse.json(
      {
        error: "Trainee has not met all floor-ready thresholds",
        status: readiness.status,
        gaps: readiness.gaps,
      },
      { status: 422 }
    )
  }

  // Create signoff with threshold snapshot
  let signoff
  try {
    signoff = await prisma.floorReadySignoff.create({
      data: {
        traineeId: body.traineeId,
        supervisorId: auth.userId,
        facilityId: auth.facilityId,
        status: "CONFIRMED",
        notes: body.notes ?? null,
        thresholdSnapshot: JSON.parse(JSON.stringify(FLOOR_READY_THRESHOLDS)),
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Trainee already has a floor-ready signoff" },
        { status: 409 }
      )
    }
    throw error
  }

  return NextResponse.json({ signoff }, { status: 201 })
}
