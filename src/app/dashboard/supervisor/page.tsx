/**
 * /dashboard/supervisor — Supervisor dashboard page
 *
 * Server component. Fetches all trainees at the supervisor's facility.
 *
 * Four sections:
 *   A. Cohort Overview Row — horizontal scroll of trainee cards
 *   B. Exception Heatmap — aggregated across all trainees
 *   C. Cohort Trend Chart — average score / pass rate over 28 days
 *   D. Needs Attention List — NEEDS_COACHING trainees
 *
 * Per CLAUDE.md §Architecture: server component, DB via Prisma.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  assessFloorReadiness,
  getExceptionCoverage,
  type SimSessionInput,
  type ModuleProgressInput,
  type FloorReadinessReport,
} from "@/lib/floorReadiness"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"
import { SupervisorDashboardClient } from "./supervisor-client"

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES (server → client serialization)
// ─────────────────────────────────────────────────────────────────────────────

export interface TraineeOverview {
  userId: string
  name: string
  employeeId: string
  startDate: string
  bestScore: number
  sessionsCompleted: number
  sessionsRequired: number
  lastActive: string | null
  report: FloorReadinessReport
  hasSignoff: boolean
}

export interface CohortTrendPoint {
  date: string
  avgScore: number
  passRate: number
  avgAccuracy: number
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE (Server Component)
// ─────────────────────────────────────────────────────────────────────────────

export default async function SupervisorDashboardPage() {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const facilityId = auth.facilityId

  // Fetch all trainees at facility
  const trainees = await prisma.user.findMany({
    where: { facilityId, role: "TRAINEE" },
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
        },
        orderBy: { startedAt: "desc" },
      },
      moduleProgress: {
        select: { moduleId: true, completed: true, bestScore: true },
      },
      receivedSignoff: {
        where: { status: "CONFIRMED" },
        select: { id: true },
        take: 1,
      },
    },
  })

  // Assess each trainee
  const traineeOverviews: TraineeOverview[] = trainees.map((t) => {
    const sessions: SimSessionInput[] = t.sessions.map((s) => ({
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

    const progress: ModuleProgressInput[] = t.moduleProgress.map((mp) => ({
      moduleId: mp.moduleId,
      completed: mp.completed,
      bestScore: mp.bestScore,
    }))

    const report = assessFloorReadiness(sessions, progress)
    const completedSessions = sessions.filter(
      (s) => s.status === "COMPLETED"
    )
    const bestScore = completedSessions.reduce(
      (max, s) => Math.max(max, s.finalScore ?? 0),
      0
    )

    return {
      userId: t.id,
      name: t.name,
      employeeId: t.employeeId,
      startDate: t.startDate.toISOString(),
      bestScore,
      sessionsCompleted: completedSessions.length,
      sessionsRequired: FLOOR_READY_THRESHOLDS.minSimulationsCompleted,
      lastActive:
        t.sessions.length > 0 ? t.sessions[0].startedAt.toISOString() : null,
      report,
      hasSignoff: t.receivedSignoff.length > 0,
    }
  })

  // Aggregate exception coverage
  const allSessions: SimSessionInput[] = trainees.flatMap((t) =>
    t.sessions.map((s) => ({
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
  )
  const cohortExceptionCoverage = getExceptionCoverage(allSessions)

  // Build cohort trend data (last 28 days)
  const twentyEightDaysAgo = new Date()
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

  const trendData: CohortTrendPoint[] = []
  for (let i = 27; i >= 0; i--) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    day.setHours(0, 0, 0, 0)

    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)

    const daySessions = allSessions.filter((s) => {
      if (!s.completedAt) return false
      const d = new Date(s.completedAt)
      return d >= day && d < nextDay
    })

    const avgScore =
      daySessions.length > 0
        ? daySessions.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) /
          daySessions.length
        : 0

    const passRate =
      daySessions.length > 0
        ? daySessions.filter((s) => s.passed === true).length /
          daySessions.length
        : 0

    const avgAccuracy =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce((sum, s) => sum + (s.accuracyScore ?? 0), 0) /
              daySessions.length
          )
        : 0

    trendData.push({
      date: day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate * 100),
      avgAccuracy,
    })
  }

  return (
    <SupervisorDashboardClient
      trainees={traineeOverviews}
      cohortExceptionCoverage={cohortExceptionCoverage}
      trendData={trendData}
    />
  )
}
