/**
 * /dashboard/trainee — Trainee's own progress dashboard
 *
 * Server component. Requires authentication — redirects to /login if not
 * authenticated. Always fetches only the calling user's own data.
 *
 * Five sections (rendered in TraineeDashboardClient):
 *   1. Floor-Ready Status
 *   2. What to Do Next (single CTA)
 *   3. My Scores (scenario cards)
 *   4. Exception Practice Tracker
 *   5. Session History
 *
 * Per CLAUDE.md §Architecture: server component, DB via Prisma.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  type SimSessionInput,
  type ModuleProgressInput,
  type FloorReadinessReport,
} from "@/lib/floorReadiness"
import {
  TraineeDashboardClient,
  type TraineeDashboardSession,
  type SerializedFloorReadinessReport,
} from "./trainee-dashboard-client"

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Convert Date fields to ISO strings for client serialization. */
function serializeReport(report: FloorReadinessReport): SerializedFloorReadinessReport {
  return {
    status: report.status,
    gaps: report.gaps,
    suggestedAt: report.suggestedAt?.toISOString() ?? null,
    confirmedAt: report.confirmedAt?.toISOString() ?? null,
    confirmedBy: report.confirmedBy,
    exceptionCoverage: report.exceptionCoverage,
    scoreHistory: report.scoreHistory,
    trend: report.trend,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE (Server Component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function TraineeDashboardPage() {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const { userId, role } = await getRoleFromSession()
  if (!userId || !role) {
    redirect("/login")
  }

  // Bug 7: non-trainees who land on /dashboard/trainee must be sent to their
  // own dashboard. A supervisor logging in should never see "Welcome back, Sam".
  if (role !== "TRAINEE") {
    const roleDashboard: Record<string, string> = {
      SUPERVISOR: "/dashboard/supervisor",
      PICK_LEAD: "/dashboard/lead",
      WAREHOUSE_MGR: "/dashboard/manager",
    }
    redirect(roleDashboard[role] ?? "/dashboard/supervisor")
  }

  // ── Fetch all data for this user in parallel ───────────────────────────────
  const [dbUser, dbSessions, dbProgress, dbSignoff] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, facilityId: true },
    }),
    prisma.simSession.findMany({
      where: { userId }, // always scoped to calling user
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
    redirect("/login")
  }

  // ── Build floorReadiness inputs ────────────────────────────────────────────
  type DbSession = typeof dbSessions[number]
  type DbProgress = typeof dbProgress[number]

  const sessionInputs: SimSessionInput[] = dbSessions.map((s: DbSession) => ({
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

  const progressInputs: ModuleProgressInput[] = dbProgress.map((p: DbProgress) => ({
    moduleId: p.moduleId,
    completed: p.completed,
    bestScore: p.bestScore,
  }))

  const floorReport = assessFloorReadiness(sessionInputs, progressInputs)

  // ── Serialize for client (Date → string) ──────────────────────────────────
  const serializedSessions: TraineeDashboardSession[] = dbSessions.map((s: DbSession) => ({
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
    errors: s.errors,
    scanEvents: s.scanEvents,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    totalTimeMs: s.totalTimeMs,
  }))

  const serializedReport = serializeReport(floorReport)

  const serializedSignoff = dbSignoff
    ? {
        confirmedAt: dbSignoff.confirmedAt.toISOString(),
        supervisorName: dbSignoff.supervisor.name,
      }
    : null

  return (
    <TraineeDashboardClient
      sessions={serializedSessions}
      floorReport={serializedReport}
      user={{ name: dbUser.name, email: dbUser.email, facilityId: dbUser.facilityId }}
      signoff={serializedSignoff}
    />
  )
}
