/**
 * Trainee Replay Page (Server Component)
 *
 * Fetches a SimSession for the authenticated trainee and renders the
 * interactive replay view. Ownership is strictly enforced — trainees
 * can only view their own sessions.
 *
 * Route: /dashboard/trainee/replay/[sessionId]
 * Access: TRAINEE (protected by middleware.ts ROUTE_ROLE_MAP)
 *
 * Per CLAUDE.md §Architecture: business logic in /src/lib/, not components.
 * Per BBWD-WI-030: trainees review their own session history only.
 */

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"
import { ReplayPageClient } from "@/app/dashboard/supervisor/replay/[sessionId]/replay-client"
import type { ReplayEvent } from "@/components/dashboard/ReplayTimeline"

/** Shape of a parsed replay event from the replayEvents JSON column. */
interface StoredReplayEvent {
  index: number
  timestamp: string
  step: string
  scannedValue: string
  expectedValue: string
  result: string
  responseTimeMs: number
  injected?: boolean
  sopReference?: string
  screen?: {
    lines: { label?: string; value?: string; isHighlighted?: boolean }[]
    activeField?: string
    inputType?: string
  }
}

interface TraineeReplayPageProps {
  params: Promise<{ sessionId: string }>
}

export default async function TraineeReplayPage({ params }: TraineeReplayPageProps) {
  const { sessionId } = await params
  const { role, userId } = await getRoleFromSession()

  if (!userId) redirect("/login")

  // Non-trainees have a dedicated supervisor replay page
  if (role !== "TRAINEE") {
    redirect(`/dashboard/supervisor/replay/${sessionId}`)
  }

  // Enforce ownership — trainees can only replay their own sessions.
  // findFirst with { id, userId } is the ownership check.
  const session = await prisma.simSession.findFirst({
    where: { id: sessionId, userId },
    select: {
      id: true,
      moduleId: true,
      difficulty: true,
      status: true,
      finalScore: true,
      accuracyScore: true,
      passed: true,
      replayEvents: true,
      startedAt: true,
      completedAt: true,
      user: {
        select: {
          name: true,
          employeeId: true,
        },
      },
    },
  })

  if (!session) redirect("/unauthorized")

  const rawEvents = session.replayEvents as StoredReplayEvent[] | null
  const events: ReplayEvent[] = (rawEvents ?? []).map((e, i) => ({
    index: e.index ?? i,
    timestamp: e.timestamp,
    step: e.step,
    scannedValue: e.scannedValue,
    expectedValue: e.expectedValue,
    result: e.result,
    responseTimeMs: e.responseTimeMs,
    injected: e.injected,
    sopReference: e.sopReference,
  }))

  const screens = (rawEvents ?? []).map((e) => e.screen ?? null)

  return (
    <ReplayPageClient
      sessionId={session.id}
      moduleId={session.moduleId}
      difficulty={session.difficulty}
      status={session.status}
      finalScore={session.finalScore}
      accuracyScore={session.accuracyScore}
      passed={session.passed}
      traineeName={session.user.name}
      traineeEmployeeId={session.user.employeeId}
      startedAt={session.startedAt.toISOString()}
      completedAt={session.completedAt?.toISOString() ?? null}
      events={events}
      screens={screens}
    />
  )
}
