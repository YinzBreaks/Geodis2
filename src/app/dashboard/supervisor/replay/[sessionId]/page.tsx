/**
 * Replay Page (Server Component)
 *
 * Fetches a SimSession's replayEvents and passes them to the client component
 * for interactive playback alongside a read-only RF Device screen.
 *
 * Route: /dashboard/supervisor/replay/[sessionId]
 * Access: SUPERVISOR only (enforced by middleware.ts)
 */

import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import { redirect } from "next/navigation"
import { ReplayPageClient } from "./replay-client"
import type { ReplayEvent } from "@/components/dashboard/ReplayTimeline"

/** Shape of a screen snapshot stored inside each replay event. */
export interface ReplayScreenSnapshot {
  lines: { label?: string; value?: string; isHighlighted?: boolean }[]
  activeField?: string
  inputType?: string
}

/** Shape of a parsed replay event from the JSON column. */
export interface StoredReplayEvent {
  index: number
  timestamp: string
  step: string
  scannedValue: string
  expectedValue: string
  result: string
  responseTimeMs: number
  injected?: boolean
  sopReference?: string
  /** Optional screen snapshot for reconstruction */
  screen?: ReplayScreenSnapshot
}

interface ReplayPageProps {
  params: Promise<{ sessionId: string }>
}

export default async function ReplayPage({ params }: ReplayPageProps) {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.facilityId) {
    redirect("/unauthorized")
  }

  const { sessionId } = await params

  const session = await prisma.simSession.findFirst({
    where: {
      id: sessionId,
      user: { facilityId: auth.facilityId, role: "TRAINEE" },
    },
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

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 font-mono text-sm">Session not found.</p>
      </main>
    )
  }

  // Parse replay events from JSON column
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

  // Extract screen snapshots for each event (if available)
  const screens: (ReplayScreenSnapshot | null)[] = (rawEvents ?? []).map(
    (e) => e.screen ?? null
  )

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
