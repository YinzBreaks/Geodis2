/**
 * GET /api/dashboard/trainee — Trainee's own dashboard data
 *
 * Auth: any authenticated user — always filtered to the calling user's ID.
 * Never exposes another user's session data regardless of role.
 *
 * Returns:
 *   sessions     — all SimSession rows for this user
 *   floorReport  — FloorReadinessReport computed server-side
 *   user         — { name, email, facilityId }
 *   signoff      — most recent confirmed signoff, if any
 *
 * Per CLAUDE.md §Architecture: all DB access via Prisma in API routes.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  type SimSessionInput,
  type ModuleProgressInput,
} from "@/lib/floorReadiness"

export async function GET() {
  const { userId } = await getRoleFromSession()

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // ── Fetch all data for this user in parallel ──────────────────────────────
  const [dbUser, dbSessions, dbProgress, dbSignoff] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, facilityId: true },
    }),
    prisma.simSession.findMany({
      where: { userId }, // ← always scoped to calling user
      orderBy: { startedAt: "desc" },
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
        errors: true,
        scanEvents: true,
        startedAt: true,
        completedAt: true,
        totalTimeMs: true,
      },
    }),
    prisma.moduleProgress.findMany({
      where: { userId },
      select: { moduleId: true, completed: true, bestScore: true },
    }),
    prisma.floorReadySignoff.findFirst({
      where: { traineeId: userId, status: "CONFIRMED" },
      orderBy: { confirmedAt: "desc" },
      include: {
        supervisor: { select: { name: true } },
      },
    }),
  ])

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // ── Build inputs for the floorReadiness algorithm ─────────────────────────
  const sessionInputs: SimSessionInput[] = dbSessions.map((s) => ({
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

  const progressInputs: ModuleProgressInput[] = dbProgress.map((p) => ({
    moduleId: p.moduleId,
    completed: p.completed,
    bestScore: p.bestScore,
  }))

  const floorReport = assessFloorReadiness(sessionInputs, progressInputs)

  return NextResponse.json({
    sessions: dbSessions.map((s) => ({
      ...s,
      startedAt: s.startedAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
    })),
    floorReport: {
      ...floorReport,
      suggestedAt: floorReport.suggestedAt?.toISOString() ?? null,
      confirmedAt: floorReport.confirmedAt?.toISOString() ?? null,
    },
    user: {
      name: dbUser.name,
      email: dbUser.email,
      facilityId: dbUser.facilityId,
    },
    signoff: dbSignoff
      ? {
          confirmedAt: dbSignoff.confirmedAt.toISOString(),
          supervisorName: dbSignoff.supervisor.name,
        }
      : null,
  })
}
