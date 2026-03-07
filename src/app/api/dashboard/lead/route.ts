/**
 * GET /api/dashboard/lead — Pick Lead dashboard data
 *
 * Auth: PICK_LEAD only.
 * Returns assigned trainees only — no replayEvents.
 *
 * Per CLAUDE.md: All DB access via Prisma through API routes.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  type SimSessionInput,
  type ModuleProgressInput,
} from "@/lib/floorReadiness"

export async function GET() {
  const auth = await requireRole("PICK_LEAD")
  if (!auth.authorized || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  // Pick Lead only sees assigned trainees
  const assignedIds = auth.assignedTrainees ?? []

  if (assignedIds.length === 0) {
    return NextResponse.json({ trainees: [] })
  }

  const trainees = await prisma.user.findMany({
    where: { id: { in: assignedIds }, role: "TRAINEE" },
    select: {
      id: true,
      name: true,
      employeeId: true,
      startDate: true,
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
          startedAt: true,
          completedAt: true,
          totalTimeMs: true,
          // NO replayEvents — Pick Lead cannot access replay
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
        select: { id: true, confirmedAt: true },
        take: 1,
      },
    },
  })

  const traineeReports = trainees.map((trainee) => {
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

    const completedSessions = sessions.filter(
      (s) => s.status === "COMPLETED"
    )
    const bestScore = completedSessions.reduce(
      (max, s) => Math.max(max, s.finalScore ?? 0),
      0
    )
    const lastActive =
      trainee.sessions.length > 0 ? trainee.sessions[0].startedAt : null

    return {
      userId: trainee.id,
      name: trainee.name,
      employeeId: trainee.employeeId,
      startDate: trainee.startDate,
      bestScore,
      sessionsCompleted: completedSessions.length,
      lastActive,
      report,
      signoff,
    }
  })

  return NextResponse.json({ trainees: traineeReports })
}
