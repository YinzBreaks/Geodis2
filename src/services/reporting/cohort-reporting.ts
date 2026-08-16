import { prisma } from "@/lib/prisma"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"
import {
  assessFloorReadiness,
  getExceptionCoverage,
  type ExceptionStats,
  type FloorReadinessReport,
  type ModuleProgressInput,
  type SimSessionInput,
} from "@/lib/floorReadiness"

export interface CohortTraineeOverview {
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

export interface CohortReportData {
  trainees: CohortTraineeOverview[]
  cohortExceptionCoverage: Record<string, ExceptionStats>
  trendData: CohortTrendPoint[]
}

interface CohortScope {
  facilityId: string
  traineeIds?: string[]
}

interface CohortSessionRecord extends SimSessionInput {
  startedAt: Date
}

interface CohortTraineeRecord {
  id: string
  name: string
  employeeId: string
  startDate: Date
  sessions: CohortSessionRecord[]
  moduleProgress: ModuleProgressInput[]
  hasSignoff: boolean
}

/** Build cohort readiness summaries and 28-day trend data. */
export function buildCohortReport(
  records: CohortTraineeRecord[],
  now = new Date()
): CohortReportData {
  const allSessions = records.flatMap((record) => record.sessions)
  const trainees = records.map((record) => {
    const report = assessFloorReadiness(record.sessions, record.moduleProgress)
    const completedSessions = record.sessions.filter(
      (session) => session.status === "COMPLETED"
    )

    return {
      userId: record.id,
      name: record.name,
      employeeId: record.employeeId,
      startDate: record.startDate.toISOString(),
      bestScore: completedSessions.reduce(
        (best, session) => Math.max(best, session.finalScore ?? 0),
        0
      ),
      sessionsCompleted: completedSessions.length,
      sessionsRequired: FLOOR_READY_THRESHOLDS.minSimulationsCompleted,
      lastActive: record.sessions[0]?.startedAt.toISOString() ?? null,
      report,
      hasSignoff: record.hasSignoff,
    }
  })

  const trendData: CohortTrendPoint[] = []
  for (let dayOffset = 27; dayOffset >= 0; dayOffset--) {
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    )
    dayStart.setUTCDate(dayStart.getUTCDate() - dayOffset)
    const dayEnd = new Date(dayStart)
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
    const sessions = allSessions.filter(
      (session) =>
        session.status === "COMPLETED" &&
        session.completedAt !== null &&
        session.completedAt >= dayStart &&
        session.completedAt < dayEnd
    )

    const divisor = sessions.length || 1
    trendData.push({
      date: dayStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      avgScore: Math.round(
        sessions.reduce(
          (sum, session) => sum + (session.finalScore ?? 0),
          0
        ) / divisor
      ),
      passRate: Math.round(
        (sessions.filter((session) => session.passed === true).length /
          divisor) *
          100
      ),
      avgAccuracy: Math.round(
        sessions.reduce(
          (sum, session) => sum + (session.accuracyScore ?? 0),
          0
        ) / divisor
      ),
    })
  }

  return {
    trainees,
    cohortExceptionCoverage: getExceptionCoverage(allSessions),
    trendData,
  }
}

/** Query one facility cohort, optionally restricted to assigned trainee IDs. */
export async function getCohortReport({
  facilityId,
  traineeIds,
}: CohortScope): Promise<CohortReportData> {
  if (traineeIds && traineeIds.length === 0) {
    return buildCohortReport([])
  }

  const trainees = await prisma.user.findMany({
    where: {
      facilityId,
      role: "TRAINEE",
      ...(traineeIds ? { id: { in: traineeIds } } : {}),
    },
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
        select: {
          moduleId: true,
          completed: true,
          bestScore: true,
        },
      },
      receivedSignoff: {
        where: { status: "CONFIRMED" },
        select: { id: true },
        take: 1,
      },
    },
  })

  return buildCohortReport(
    trainees.map((trainee) => ({
      id: trainee.id,
      name: trainee.name,
      employeeId: trainee.employeeId,
      startDate: trainee.startDate,
      sessions: trainee.sessions.map((session) => ({
        id: session.id,
        moduleId: session.moduleId,
        difficulty: session.difficulty,
        status: session.status,
        finalScore: session.finalScore,
        accuracyScore: session.accuracyScore,
        passed: session.passed,
        scanEvents: session.scanEvents,
        errors: session.errors,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      })),
      moduleProgress: trainee.moduleProgress,
      hasSignoff: trainee.receivedSignoff.length > 0,
    }))
  )
}
