/**
 * lead-client.tsx — Client component for Pick Lead dashboard
 *
 * Read-only view of assigned trainees. No floor-ready signoff.
 * Supports flagging trainees for supervisor review via POST /api/notifications.
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { useState, useCallback } from "react"
import { TraineeCard } from "@/components/dashboard/TraineeCard"
import { ExceptionHeatmap } from "@/components/dashboard/ExceptionHeatmap"
import { FLOOR_READY_THRESHOLDS } from "@/config/floorReadyConfig"
import type { FloorReadyStatus, ExceptionStats } from "@/lib/floorReadiness"
import type { LeadTraineeOverview } from "./page"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LeadDashboardClientProps {
  leadName: string
  trainees: LeadTraineeOverview[]
}

interface FlagState {
  traineeId: string
  message: string
  sending: boolean
  sent: boolean
  error: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Pick Lead dashboard — read-only with flag-for-review capability. */
export function LeadDashboardClient({
  leadName,
  trainees,
}: LeadDashboardClientProps) {
  const [flagStates, setFlagStates] = useState<Record<string, FlagState>>({})
  const [expandedTrainee, setExpandedTrainee] = useState<string | null>(null)

  /** Send a flag-for-review notification to the supervisor. */
  const flagForReview = useCallback(
    async (traineeId: string, message: string) => {
      setFlagStates((prev) => ({
        ...prev,
        [traineeId]: { traineeId, message, sending: true, sent: false, error: null },
      }))

      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traineeId, message }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }

        setFlagStates((prev) => ({
          ...prev,
          [traineeId]: { ...prev[traineeId], sending: false, sent: true, error: null },
        }))
      } catch (err) {
        setFlagStates((prev) => ({
          ...prev,
          [traineeId]: {
            ...prev[traineeId],
            sending: false,
            sent: false,
            error: err instanceof Error ? err.message : "Failed to flag",
          },
        }))
      }
    },
    []
  )

  // Sort trainees: NEEDS_COACHING first, then IN_PROGRESS, then FLOOR_READY
  const sortedTrainees = [...trainees].sort((a, b) => {
    const order: Record<string, number> = {
      NEEDS_COACHING: 0,
      IN_PROGRESS: 1,
      FLOOR_READY: 2,
    }
    return (order[a.floorReadyStatus] ?? 1) - (order[b.floorReadyStatus] ?? 1)
  })

  const needsCoachingCount = trainees.filter(
    (t) => t.floorReadyStatus === "NEEDS_COACHING"
  ).length
  const floorReadyCount = trainees.filter(
    (t) => t.floorReadyStatus === "FLOOR_READY"
  ).length

  return (
    <main className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-zinc-100 font-mono text-2xl font-bold">
          Pick Lead Dashboard
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          {leadName} · {trainees.length} assigned trainee
          {trainees.length !== 1 ? "s" : ""} ·{" "}
          <span className="text-green-400">{floorReadyCount} floor ready</span>
          {needsCoachingCount > 0 && (
            <>
              {" "}
              · <span className="text-red-400">{needsCoachingCount} needs coaching</span>
            </>
          )}
        </p>
      </header>

      {/* Trainee List */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Assigned Trainees
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedTrainees.map((t) => {
            const flagState = flagStates[t.userId]
            const isExpanded = expandedTrainee === t.userId

            return (
              <div key={t.userId}>
                <TraineeCard
                  userId={t.userId}
                  name={t.name}
                  employeeId={t.employeeId}
                  floorReadyStatus={t.floorReadyStatus as FloorReadyStatus}
                  bestScore={t.bestScore ?? 0}
                  sessionsCompleted={t.completedSessions}
                  sessionsRequired={FLOOR_READY_THRESHOLDS.minSimulationsCompleted}
                  lastActive={t.lastActive ? new Date(t.lastActive) : null}
                  gaps={t.gaps}
                />

                {/* Flag for Review */}
                <div className="mt-2 px-3">
                  {flagState?.sent ? (
                    <p className="text-green-400 font-mono text-xs">
                      ✓ Flagged for supervisor review
                    </p>
                  ) : isExpanded ? (
                    <FlagForm
                      traineeId={t.userId}
                      traineeName={t.name}
                      onSubmit={flagForReview}
                      onCancel={() => setExpandedTrainee(null)}
                      sending={flagState?.sending ?? false}
                      error={flagState?.error ?? null}
                    />
                  ) : (
                    <button
                      onClick={() => setExpandedTrainee(t.userId)}
                      className="text-yellow-500 hover:text-yellow-400 font-mono text-xs"
                    >
                      🚩 Flag for Supervisor Review
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Cohort Exception Heatmap */}
      <section>
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Team Exception Rates
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          {trainees.length > 0 && trainees[0].report ? (
            <ExceptionHeatmap
              coverage={mergeExceptionCoverage(trainees)}
              showSopRef={true}
            />
          ) : (
            <p className="text-zinc-600 font-mono text-xs">
              No exception data available.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FLAG FORM SUBCOMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function FlagForm({
  traineeId,
  traineeName,
  onSubmit,
  onCancel,
  sending,
  error,
}: {
  traineeId: string
  traineeName: string
  onSubmit: (traineeId: string, message: string) => void
  onCancel: () => void
  sending: boolean
  error: string | null
}) {
  const [message, setMessage] = useState(
    `Please review ${traineeName}'s progress — coaching may be needed.`
  )

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 space-y-2">
      <p className="text-zinc-400 font-mono text-xs">Message for supervisor:</p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1
                   text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-500
                   resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(traineeId, message)}
          disabled={sending || message.trim().length === 0}
          className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-yellow-100
                     font-mono text-xs rounded disabled:opacity-50"
        >
          {sending ? "Sending…" : "🚩 Send Flag"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 text-zinc-500 hover:text-zinc-300 font-mono text-xs"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-red-400 font-mono text-[10px]">Error: {error}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Merge exception coverage from all trainees into team-level stats. */
function mergeExceptionCoverage(
  trainees: LeadTraineeOverview[]
): Record<string, ExceptionStats> {
  const merged: Record<
    string,
    { encountered: number; resolvedCorrectly: number; commonMistake?: string }
  > = {}

  for (const t of trainees) {
    const coverage = t.report.exceptionCoverage
    for (const [key, stats] of Object.entries(coverage)) {
      if (!merged[key]) {
        merged[key] = { encountered: 0, resolvedCorrectly: 0, commonMistake: stats.commonMistake }
      }
      merged[key].encountered += stats.encountered
      merged[key].resolvedCorrectly += stats.resolvedCorrectly
    }
  }

  const result: Record<string, ExceptionStats> = {}
  for (const [key, val] of Object.entries(merged)) {
    result[key] = {
      encountered: val.encountered,
      resolvedCorrectly: val.resolvedCorrectly,
      resolutionRate: val.encountered > 0 ? val.resolvedCorrectly / val.encountered : 0,
      commonMistake: val.commonMistake,
    }
  }

  return result
}
