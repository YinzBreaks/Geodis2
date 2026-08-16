import { prisma } from "@/lib/prisma"
import {
  getExceptionCoverage,
  type SimSessionInput,
} from "@/lib/floorReadiness"

export interface ManagerKPIs {
  activeTrainees: number
  avgFinalScore: number
  floorReadyRate: number
  avgDaysToReady: number | null
}

export interface WeeklySignoff {
  weekLabel: string
  count: number
}

export interface ExceptionFailureRate {
  exceptionType: string
  label: string
  failureRate: number
  totalEncountered: number
}

export interface ManagerReportData {
  kpis: ManagerKPIs
  weeklySignoffs: WeeklySignoff[]
  exceptionFailureRates: ExceptionFailureRate[]
}

interface SignoffInput {
  confirmedAt: Date
  traineeStartDate: Date
}

interface BuildManagerReportInput {
  totalTrainees: number
  activeTrainees: number
  recentSessions: SimSessionInput[]
  signoffs: SignoffInput[]
  now: Date
}

const EXCEPTION_LABELS: Record<string, string> = {
  WRONG_ITEM: "Invalid Item",
  WRONG_TOTE: "Incorrect Tote",
  WRONG_LOCATION: "Incorrect Location",
  TOTE_ALLOCATED: "Tote Already Allocated",
  CART_ALLOCATED: "Pick Cart Already Created",
  ITEM_NOT_FOUND: "Short Inventory",
  ITEM_DAMAGED: "Damaged Item",
  TIMEOUT: "Scan Timeout",
}

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

/** Build one canonical single-facility Manager report from persisted records. */
export function buildManagerReport({
  totalTrainees,
  activeTrainees,
  recentSessions,
  signoffs,
  now,
}: BuildManagerReportInput): ManagerReportData {
  const avgFinalScore =
    recentSessions.length > 0
      ? recentSessions.reduce(
          (sum, session) => sum + (session.finalScore ?? 0),
          0
        ) / recentSessions.length
      : 0

  const avgDaysToReady =
    signoffs.length > 0
      ? signoffs.reduce((sum, signoff) => {
          const elapsedMs =
            signoff.confirmedAt.getTime() - signoff.traineeStartDate.getTime()
          return sum + Math.max(elapsedMs / 86_400_000, 0)
        }, 0) / signoffs.length
      : null

  const today = startOfUtcDay(now)
  const weeklySignoffs: WeeklySignoff[] = []
  for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(today)
    weekStart.setUTCDate(weekStart.getUTCDate() - weekOffset * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

    weeklySignoffs.push({
      weekLabel: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: signoffs.filter(
        (signoff) =>
          signoff.confirmedAt >= weekStart && signoff.confirmedAt < weekEnd
      ).length,
    })
  }

  const coverage = getExceptionCoverage(recentSessions)
  const exceptionFailureRates = Object.entries(coverage).map(
    ([exceptionType, stats]) => ({
      exceptionType,
      label: EXCEPTION_LABELS[exceptionType] ?? exceptionType,
      failureRate:
        stats.encountered > 0
          ? Math.round((1 - stats.resolutionRate) * 1000) / 1000
          : 0,
      totalEncountered: stats.encountered,
    })
  )

  return {
    kpis: {
      activeTrainees,
      avgFinalScore: Math.round(avgFinalScore * 10) / 10,
      floorReadyRate:
        totalTrainees > 0
          ? Math.round((signoffs.length / totalTrainees) * 1000) / 10
          : 0,
      avgDaysToReady:
        avgDaysToReady === null
          ? null
          : Math.round(avgDaysToReady * 10) / 10,
    },
    weeklySignoffs,
    exceptionFailureRates,
  }
}

/** Query and calculate the canonical Manager report for one facility. */
export async function getManagerReport(
  facilityId: string,
  now = new Date()
): Promise<ManagerReportData> {
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const [totalTrainees, activeUsers, recentSessionRows, signoffRows] =
    await Promise.all([
      prisma.user.count({ where: { facilityId, role: "TRAINEE" } }),
      prisma.simSession.groupBy({
        by: ["userId"],
        where: {
          user: { facilityId, role: "TRAINEE" },
          startedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.simSession.findMany({
        where: {
          user: { facilityId, role: "TRAINEE" },
          status: "COMPLETED",
          completedAt: { gte: thirtyDaysAgo },
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
      }),
      prisma.floorReadySignoff.findMany({
        where: { facilityId, status: "CONFIRMED" },
        select: {
          confirmedAt: true,
          trainee: { select: { startDate: true } },
        },
      }),
    ])

  const recentSessions: SimSessionInput[] = recentSessionRows.map((session) => ({
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

  return buildManagerReport({
    totalTrainees,
    activeTrainees: activeUsers.length,
    recentSessions,
    signoffs: signoffRows.map((signoff) => ({
      confirmedAt: signoff.confirmedAt,
      traineeStartDate: signoff.trainee.startDate,
    })),
    now,
  })
}
