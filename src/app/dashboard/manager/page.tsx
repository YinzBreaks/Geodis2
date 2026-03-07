/**
 * Manager Dashboard Page (Server Component)
 *
 * Warehouse Manager sees aggregate KPIs and cohort trends only.
 * No individual trainee names, no replay access.
 *
 * Route: /dashboard/manager
 * Access: WAREHOUSE_MGR only (enforced by middleware.ts)
 */

import { prisma } from "@/lib/prisma"
import { createSupabaseServerClient } from "@/lib/auth/roles"
import { ManagerDashboardClient } from "./manager-client"

/** KPI cards for the manager view. */
export interface ManagerKPIs {
  activeTrainees: number
  avgFinalScore: number
  floorReadyRate: number
  avgDaysToReady: number | null
}

/** Weekly signoff data point. */
export interface WeeklySignoff {
  weekLabel: string
  count: number
}

/** Exception failure rate for the facility. */
export interface ExceptionFailureRate {
  exceptionType: string
  label: string
  failureRate: number
  totalEncountered: number
}

export default async function ManagerDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 font-mono text-sm">Not authenticated.</p>
      </main>
    )
  }

  const mgrUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { facilityId: true, name: true },
  })

  if (!mgrUser) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 font-mono text-sm">User not found.</p>
      </main>
    )
  }

  const facilityId = mgrUser.facilityId

  // Count active trainees at facility
  const activeTrainees = await prisma.user.count({
    where: { facilityId, role: "TRAINEE" },
  })

  // Average final score across last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentSessions = await prisma.simSession.findMany({
    where: {
      user: { facilityId, role: "TRAINEE" },
      status: "COMPLETED",
      completedAt: { gte: thirtyDaysAgo },
    },
    select: {
      finalScore: true,
      scanEvents: true,
    },
  })

  const avgFinalScore =
    recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) /
        recentSessions.length
      : 0

  // Floor-ready signoffs
  const signoffs = await prisma.floorReadySignoff.findMany({
    where: { facilityId },
    select: { confirmedAt: true },
    orderBy: { confirmedAt: "desc" },
  })

  const totalTrainees = Math.max(activeTrainees, 1)
  const floorReadyRate = signoffs.length / totalTrainees

  // Average days to ready (from first session to signoff date)
  let avgDaysToReady: number | null = null
  if (signoffs.length > 0) {
    const signedTraineeIds = await prisma.floorReadySignoff.findMany({
      where: { facilityId },
      select: { traineeId: true, confirmedAt: true },
    })

    const daysToReady: number[] = []
    for (const s of signedTraineeIds) {
      const firstSession = await prisma.simSession.findFirst({
        where: { userId: s.traineeId },
        orderBy: { startedAt: "asc" },
        select: { startedAt: true },
      })
      if (firstSession) {
        const diffMs =
          new Date(s.confirmedAt).getTime() -
          new Date(firstSession.startedAt).getTime()
        daysToReady.push(diffMs / (1000 * 60 * 60 * 24))
      }
    }

    if (daysToReady.length > 0) {
      avgDaysToReady =
        daysToReady.reduce((a, b) => a + b, 0) / daysToReady.length
    }
  }

  const kpis: ManagerKPIs = {
    activeTrainees,
    avgFinalScore: Math.round(avgFinalScore * 10) / 10,
    floorReadyRate: Math.round(floorReadyRate * 100) / 100,
    avgDaysToReady: avgDaysToReady
      ? Math.round(avgDaysToReady * 10) / 10
      : null,
  }

  // Weekly signoffs (last 8 weeks)
  const weeklySignoffs: WeeklySignoff[] = []
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7)
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() - w * 7)

    const count = signoffs.filter((s) => {
      const d = new Date(s.confirmedAt)
      return d >= weekStart && d < weekEnd
    }).length

    weeklySignoffs.push({
      weekLabel: `W-${w}`,
      count,
    })
  }

  // Exception failure rates across the facility
  const EXCEPTION_LABELS: Record<string, string> = {
    WRONG_ITEM: "Wrong Item",
    WRONG_TOTE: "Wrong Tote",
    WRONG_LOCATION: "Wrong Location",
    TOTE_ALLOCATED: "Tote Already Allocated",
    CART_ALLOCATED: "Cart Already Created",
    ITEM_NOT_FOUND: "Short Inventory",
    ITEM_DAMAGED: "Damaged Item",
    TIMEOUT: "Timeout",
  }

  const exceptionStats: Record<string, { encountered: number; failed: number }> = {}
  for (const key of Object.keys(EXCEPTION_LABELS)) {
    exceptionStats[key] = { encountered: 0, failed: 0 }
  }

  for (const s of recentSessions) {
    const events = Array.isArray(s.scanEvents)
      ? (s.scanEvents as Array<{ result?: string; resolved?: boolean }>)
      : []
    for (const e of events) {
      if (e.result && e.result !== "SUCCESS" && exceptionStats[e.result]) {
        exceptionStats[e.result].encountered++
        if (!e.resolved) {
          exceptionStats[e.result].failed++
        }
      }
    }
  }

  const exceptionFailureRates: ExceptionFailureRate[] = Object.entries(
    exceptionStats
  ).map(([key, val]) => ({
    exceptionType: key,
    label: EXCEPTION_LABELS[key] ?? key,
    failureRate:
      val.encountered > 0
        ? Math.round((val.failed / val.encountered) * 1000) / 1000
        : 0,
    totalEncountered: val.encountered,
  }))

  return (
    <ManagerDashboardClient
      managerName={mgrUser.name}
      facilityId={facilityId}
      kpis={kpis}
      weeklySignoffs={weeklySignoffs}
      exceptionFailureRates={exceptionFailureRates}
    />
  )
}
