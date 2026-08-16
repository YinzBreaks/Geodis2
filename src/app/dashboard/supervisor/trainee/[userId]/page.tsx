/**
 * /dashboard/supervisor/trainee/[userId] — Individual trainee drill-down
 *
 * Server component. Shows:
 *   A. Header — name, employee ID, days in training, floor-ready status/gaps
 *   B. Score Trend — line chart of finalScore per session
 *   C. Exception Breakdown Table — per-type stats with commonMistake
 *   D. Session History Table — all sessions with replay button
 *
 * Per CLAUDE.md §Architecture: server component, DB via Prisma.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  type SimSessionInput,
  type ModuleProgressInput,
} from "@/lib/floorReadiness"
import { TraineeDetailClient } from "./trainee-detail-client"

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZABLE DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface TraineeDetail {
  userId: string
  name: string
  employeeId: string
  startDate: string
  daysInTraining: number
}

export interface SessionRow {
  id: string
  moduleId: string
  difficulty: string
  status: string
  finalScore: number | null
  accuracyScore: number | null
  speedScore: number | null
  passed: boolean | null
  totalPicks: number | null
  errorCount: number | null
  startedAt: string
  completedAt: string | null
  totalTimeMs: number | null
  hasReplayEvents: boolean
}

export interface SignoffData {
  id: string
  confirmedAt: string
  notes: string | null
  supervisorName: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE (Server Component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function TraineeDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const { userId } = await params

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
        select: { moduleId: true, completed: true, bestScore: true },
      },
      receivedSignoff: {
        where: { status: "CONFIRMED" },
        select: {
          id: true,
          confirmedAt: true,
          notes: true,
          supervisor: { select: { name: true } },
        },
        take: 1,
      },
    },
  })

  if (!trainee) {
    redirect("/dashboard/supervisor")
  }

  // Assess floor readiness
  const sessionsInput: SimSessionInput[] = trainee.sessions.map((s) => ({
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

  const progressInput: ModuleProgressInput[] = trainee.moduleProgress.map(
    (mp) => ({
      moduleId: mp.moduleId,
      completed: mp.completed,
      bestScore: mp.bestScore,
    })
  )

  const report = assessFloorReadiness(sessionsInput, progressInput)

  // Serialize for client
  const traineeDetail: TraineeDetail = {
    userId: trainee.id,
    name: trainee.name,
    employeeId: trainee.employeeId,
    startDate: trainee.startDate.toISOString(),
    daysInTraining: Math.ceil(
      (Date.now() - trainee.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ),
  }

  const sessionRows: SessionRow[] = trainee.sessions.map((s) => ({
    id: s.id,
    moduleId: s.moduleId,
    difficulty: s.difficulty,
    status: s.status,
    finalScore: s.finalScore,
    accuracyScore: s.accuracyScore,
    speedScore: s.speedScore,
    passed: s.passed,
    totalPicks: s.totalPicks,
    errorCount: s.errorCount,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    totalTimeMs: s.totalTimeMs,
    hasReplayEvents: s.replayEvents !== null,
  }))

  const existingSignoff = trainee.receivedSignoff[0]
  const signoff: SignoffData | null = existingSignoff
    ? {
        id: existingSignoff.id,
        confirmedAt: existingSignoff.confirmedAt.toISOString(),
        notes: existingSignoff.notes,
        supervisorName: existingSignoff.supervisor.name,
      }
    : null

  return (
    <TraineeDetailClient
      trainee={traineeDetail}
      sessions={sessionRows}
      report={report}
      signoff={signoff}
    />
  )
}
