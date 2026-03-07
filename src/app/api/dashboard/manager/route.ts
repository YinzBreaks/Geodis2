/**
 * GET /api/dashboard/manager — Warehouse Manager dashboard data
 *
 * Auth: WAREHOUSE_MGR only.
 * Returns aggregate data only — NO individual trainee names, NO session
 * scanEvents/replayEvents.
 *
 * Per CLAUDE.md: All DB access via Prisma through API routes.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  getExceptionCoverage,
  type SimSessionInput,
} from "@/lib/floorReadiness"

export async function GET() {
  const auth = await requireRole("WAREHOUSE_MGR")
  if (!auth.authorized || !auth.facilityId) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 403 }
    )
  }

  const facilityId = auth.facilityId

  // Active trainees this week
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const activeTraineesThisWeek = await prisma.simSession.groupBy({
    by: ["userId"],
    where: {
      user: { facilityId, role: "TRAINEE" },
      startedAt: { gte: oneWeekAgo },
    },
  })

  // Aggregate scores
  const allCompletedSessions = await prisma.simSession.findMany({
    where: {
      user: { facilityId, role: "TRAINEE" },
      status: "COMPLETED",
    },
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
  })

  const avgFinalScore =
    allCompletedSessions.length > 0
      ? allCompletedSessions.reduce(
          (sum, s) => sum + (s.finalScore ?? 0),
          0
        ) / allCompletedSessions.length
      : 0

  // Floor-ready rate
  const totalTrainees = await prisma.user.count({
    where: { facilityId, role: "TRAINEE" },
  })
  const floorReadyCount = await prisma.floorReadySignoff.count({
    where: { facilityId, status: "CONFIRMED" },
  })
  const floorReadyRate =
    totalTrainees > 0 ? floorReadyCount / totalTrainees : 0

  // Average days to floor-ready
  const signoffs = await prisma.floorReadySignoff.findMany({
    where: { facilityId, status: "CONFIRMED" },
    select: {
      confirmedAt: true,
      trainee: { select: { startDate: true } },
    },
  })
  const avgDaysToReady =
    signoffs.length > 0
      ? signoffs.reduce((sum, so) => {
          const days =
            (new Date(so.confirmedAt).getTime() -
              new Date(so.trainee.startDate).getTime()) /
            (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / signoffs.length
      : 0

  // Weekly floor-ready signoffs (last 8 weeks)
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

  const recentSignoffs = await prisma.floorReadySignoff.findMany({
    where: {
      facilityId,
      status: "CONFIRMED",
      confirmedAt: { gte: eightWeeksAgo },
    },
    select: { confirmedAt: true },
    orderBy: { confirmedAt: "asc" },
  })

  // Group by week
  const weeklySignoffs: Array<{ week: string; count: number }> = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const count = recentSignoffs.filter((s) => {
      const d = new Date(s.confirmedAt)
      return d >= weekStart && d < weekEnd
    }).length

    weeklySignoffs.push({
      week: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count,
    })
  }

  // Exception failure rates across facility
  const sessionInputs: SimSessionInput[] = allCompletedSessions.map((s) => ({
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
  const exceptionCoverage = getExceptionCoverage(sessionInputs)

  // Facility comparison (if manager oversees multiple)
  const allFacilities = await prisma.user.groupBy({
    by: ["facilityId"],
    where: { role: "TRAINEE" },
    _count: true,
  })

  const facilityComparison = await Promise.all(
    allFacilities.map(async (fac) => {
      const facSessions = await prisma.simSession.findMany({
        where: {
          user: { facilityId: fac.facilityId, role: "TRAINEE" },
          status: "COMPLETED",
        },
        select: { finalScore: true },
      })
      const facAvg =
        facSessions.length > 0
          ? facSessions.reduce(
              (sum, s) => sum + (s.finalScore ?? 0),
              0
            ) / facSessions.length
          : 0

      const facSignoffCount = await prisma.floorReadySignoff.count({
        where: { facilityId: fac.facilityId, status: "CONFIRMED" },
      })
      const facTraineeCount = fac._count
      const facReadyRate =
        facTraineeCount > 0 ? facSignoffCount / facTraineeCount : 0

      return {
        facilityId: fac.facilityId,
        avgScore: Math.round(facAvg),
        floorReadyRate: Math.round(facReadyRate * 100),
        traineeCount: facTraineeCount,
        isOwn: fac.facilityId === facilityId,
      }
    })
  )

  return NextResponse.json({
    kpis: {
      activeTraineesThisWeek: activeTraineesThisWeek.length,
      avgFinalScore: Math.round(avgFinalScore),
      floorReadyRate: Math.round(floorReadyRate * 100),
      avgDaysToReady: Math.round(avgDaysToReady),
    },
    weeklySignoffs,
    exceptionCoverage,
    facilityComparison,
  })
}
