/**
 * GET /api/dashboard/supervisor/trainee/[userId] — Individual trainee detail
 *
 * Auth: SUPERVISOR only.
 * Returns full trainee data including all sessions with replayEvents.
 *
 * Per CLAUDE.md: All DB access via Prisma through API routes.
 */

import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  type SimSessionInput,
  type ModuleProgressInput,
} from "@/lib/floorReadiness"

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  const { userId } = params

  // Fetch trainee at supervisor's facility
  const trainee = await prisma.user.findFirst({
    where: { id: userId, facilityId: auth.facilityId },
    select: {
      id: true,
      name: true,
      employeeId: true,
      startDate: true,
      sessions: {
        select: {
          id: true,
          moduleId: true,
          moduleType: true,
          difficulty: true,
          status: true,
          finalScore: true,
          accuracyScore: true,
          speedScore: true,
          passed: true,
          totalPicks: true,
          errorCount: true,
          scanEvents: true,
          errors: true,
          replayEvents: true,
          startedAt: true,
          completedAt: true,
          totalTimeMs: true,
        },
        orderBy: { startedAt: "desc" },
      },
      moduleProgress: {
        select: {
          moduleId: true,
          completed: true,
          bestScore: true,
        },
      },
      receivedSignoff: {
        where: { status: "CONFIRMED" },
        select: {
          id: true,
          confirmedAt: true,
          supervisorId: true,
          notes: true,
        },
        take: 1,
      },
    },
  })

  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 })
  }

  // Assess floor readiness
  const sessions: SimSessionInput[] = trainee.sessions.map((s) => ({
    id: s.id,
    moduleId: s.moduleId,
    difficulty: s.difficulty,
    status: s.status,
    finalScore: s.finalScore,
    accuracyScore: s.accuracyScore,
    passed: s.passed,
    scanEvents: s.scanEvents,
    errors: s.errors,
    completedAt: s.completedAt,
  }))

  const progress: ModuleProgressInput[] = trainee.moduleProgress.map(
    (mp) => ({
      moduleId: mp.moduleId,
      completed: mp.completed,
      bestScore: mp.bestScore,
    })
  )

  const report = assessFloorReadiness(sessions, progress)
  const signoff = trainee.receivedSignoff[0] ?? null

  return NextResponse.json({
    trainee: {
      userId: trainee.id,
      name: trainee.name,
      employeeId: trainee.employeeId,
      startDate: trainee.startDate,
      daysInTraining: Math.ceil(
        (Date.now() - new Date(trainee.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
    },
    sessions: trainee.sessions,
    report,
    signoff,
  })
}
