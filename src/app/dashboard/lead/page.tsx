/**
 * Lead Dashboard Page (Server Component)
 *
 * Pick Lead sees only their assigned trainees, read-only.
 * No floor-ready signoff, no replay access.
 * Can flag trainees for supervisor review.
 *
 * Route: /dashboard/lead
 * Access: PICK_LEAD only (enforced by middleware.ts)
 */

import { prisma } from "@/lib/prisma"
import { createSupabaseServerClient } from "@/lib/auth/roles"
import { assessFloorReadiness, type FloorReadinessReport, type FloorReadyGap } from "@/lib/floorReadiness"
import { LeadDashboardClient } from "./lead-client"

/** Trainee overview for lead. */
export interface LeadTraineeOverview {
  userId: string
  name: string
  employeeId: string
  floorReadyStatus: string
  bestScore: number | null
  completedSessions: number
  totalSessions: number
  lastActive: string | null
  gaps: FloorReadyGap[]
  report: FloorReadinessReport
}

export default async function LeadDashboardPage() {
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

  // Get the lead's profile with their assigned trainees
  const leadUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      facilityId: true,
      assignedTrainees: true,
    },
  })

  if (!leadUser || leadUser.assignedTrainees.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6">
        <h1 className="text-zinc-100 font-mono text-2xl font-bold mb-4">
          Pick Lead Dashboard
        </h1>
        <p className="text-zinc-500 font-mono text-sm">
          No trainees currently assigned.
        </p>
      </main>
    )
  }

  // Fetch assigned trainees with their sessions and module progress
  const trainees = await prisma.user.findMany({
    where: {
      id: { in: leadUser.assignedTrainees },
      role: "TRAINEE",
    },
    include: {
      sessions: {
        orderBy: { startedAt: "desc" },
      },
      moduleProgress: true,
    },
  })

  // Compute floor-readiness for each trainee
  const traineeOverviews: LeadTraineeOverview[] = trainees.map((t) => {
    const report = assessFloorReadiness(t.sessions, t.moduleProgress)
    const completed = t.sessions.filter((s: { status: string }) => s.status === "COMPLETED")
    const bestScore = completed.reduce(
      (max: number, s: { finalScore: number | null }) =>
        Math.max(max, s.finalScore ?? 0),
      0
    )
    const lastSession = t.sessions[0]

    return {
      userId: t.id,
      name: t.name,
      employeeId: t.employeeId,
      floorReadyStatus: report.status,
      bestScore: completed.length > 0 ? bestScore : null,
      completedSessions: completed.length,
      totalSessions: t.sessions.length,
      lastActive: lastSession
        ? (lastSession.completedAt ?? lastSession.startedAt).toISOString()
        : null,
      gaps: report.gaps,
      report,
    }
  })

  return (
    <LeadDashboardClient
      leadName={leadUser.name}
      trainees={traineeOverviews}
    />
  )
}
