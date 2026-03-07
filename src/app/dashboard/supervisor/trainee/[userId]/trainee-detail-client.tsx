/**
 * trainee-detail-client.tsx — Client component for individual trainee view
 *
 * Renders header, score trend chart, exception breakdown, session history,
 * and the floor-ready confirmation button/modal.
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { useState } from "react"
import Link from "next/link"
import { ScoreTrendChart, type ScoreDataPoint } from "@/components/dashboard/ScoreTrendChart"
import { ExceptionHeatmap } from "@/components/dashboard/ExceptionHeatmap"
import { FloorReadyModal } from "@/components/dashboard/FloorReadyModal"
import type { FloorReadinessReport } from "@/lib/floorReadiness"
import type { TraineeDetail, SessionRow, SignoffData } from "./page"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface TraineeDetailClientProps {
  trainee: TraineeDetail
  sessions: SessionRow[]
  report: FloorReadinessReport
  signoff: SignoffData | null
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  FLOOR_READY: {
    bg: "bg-green-900/40",
    text: "text-green-400",
    label: "🟢 Floor Ready",
  },
  IN_PROGRESS: {
    bg: "bg-yellow-900/40",
    text: "text-yellow-400",
    label: "🟡 In Progress",
  },
  NEEDS_COACHING: {
    bg: "bg-red-900/40",
    text: "text-red-400",
    label: "🔴 Needs Coaching",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Client-side rendering for individual trainee drill-down. */
export function TraineeDetailClient({
  trainee,
  sessions,
  report,
  signoff: initialSignoff,
}: TraineeDetailClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [signoff, setSignoff] = useState(initialSignoff)

  const statusStyle = STATUS_STYLES[report.status] ?? STATUS_STYLES.IN_PROGRESS

  // Build score trend data
  const completedSessions = [...sessions]
    .filter((s) => s.status === "COMPLETED" && s.finalScore !== null)
    .reverse() // chronological

  const chartData: ScoreDataPoint[] = completedSessions.map((s, i) => ({
    label: s.completedAt
      ? new Date(s.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : `#${i + 1}`,
    score: s.finalScore ?? 0,
    accuracy: s.accuracyScore ?? undefined,
    speed: s.speedScore ?? undefined,
    passed: s.passed ?? undefined,
    date: s.completedAt ?? undefined,
  }))

  function formatDuration(ms: number | null): string {
    if (!ms) return "—"
    const mins = Math.floor(ms / 60000)
    const secs = Math.round((ms % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6">
      {/* Back link */}
      <Link
        href="/dashboard/supervisor"
        className="text-zinc-500 hover:text-zinc-300 font-mono text-xs mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      {/* A. HEADER */}
      <section className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-zinc-100 font-mono text-2xl font-bold">
              {trainee.name}
            </h1>
            <p className="text-zinc-500 font-mono text-sm">
              ID: {trainee.employeeId} &middot; {trainee.daysInTraining}{" "}
              {trainee.daysInTraining === 1 ? "day" : "days"} in training
            </p>
          </div>

          <div className="text-right">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-mono ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>

            {/* Floor-ready signoff */}
            {signoff ? (
              <p className="text-green-400 font-mono text-xs mt-2">
                ✓ Floor Ready — signed off{" "}
                {new Date(signoff.confirmedAt).toLocaleDateString()} by{" "}
                {signoff.supervisorName}
              </p>
            ) : report.status === "FLOOR_READY" ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="
                  mt-2 px-4 py-2 bg-green-700 hover:bg-green-600
                  text-green-100 font-mono text-sm font-bold
                  rounded-lg transition-colors
                "
              >
                ✓ Confirm Floor Ready
              </button>
            ) : null}
          </div>
        </div>

        {/* Gap list */}
        {report.gaps.length > 0 && (
          <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 font-mono text-xs uppercase mb-2">
              Identified Gaps
            </p>
            <div className="space-y-1">
              {report.gaps.map((gap, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono">
                  <span className="text-red-400">•</span>
                  <span className="text-zinc-400">
                    {gap.criterion}:{" "}
                    <span className="text-zinc-200">{gap.current}</span>
                    <span className="text-zinc-600"> (need {gap.required})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* B. SCORE TREND */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Score Trend
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ScoreTrendChart
            data={chartData}
            threshold={75}
            showAccuracy={true}
            showSpeed={true}
            height={280}
          />
        </div>
      </section>

      {/* C. EXCEPTION BREAKDOWN TABLE */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Exception Breakdown
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ExceptionHeatmap
            coverage={report.exceptionCoverage}
            showSopRef={true}
          />
        </div>
      </section>

      {/* D. SESSION HISTORY TABLE */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Session History
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-800">
                <th className="text-left py-3 px-3">Date</th>
                <th className="text-left py-3 px-3">Module</th>
                <th className="text-left py-3 px-3">Difficulty</th>
                <th className="text-right py-3 px-3">Score</th>
                <th className="text-center py-3 px-3">Passed</th>
                <th className="text-right py-3 px-3">Duration</th>
                <th className="text-right py-3 px-3">Errors</th>
                <th className="text-center py-3 px-3">Replay</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30"
                >
                  <td className="py-2 px-3 text-zinc-300">
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : new Date(s.startedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                  </td>
                  <td className="py-2 px-3 text-zinc-300">{s.moduleId}</td>
                  <td className="py-2 px-3 text-zinc-400">{s.difficulty}</td>
                  <td className="py-2 px-3 text-right text-zinc-300">
                    {s.finalScore !== null ? Math.round(s.finalScore) : "—"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {s.passed === true ? (
                      <span className="text-green-400">✓</span>
                    ) : s.passed === false ? (
                      <span className="text-red-400">✗</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-400">
                    {formatDuration(s.totalTimeMs)}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-400">
                    {s.errorCount ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {s.hasReplayEvents ? (
                      <Link
                        href={`/dashboard/supervisor/replay/${s.id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        ▶ Replay
                      </Link>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-zinc-600"
                  >
                    No sessions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Floor-ready confirmation modal */}
      <FloorReadyModal
        traineeId={trainee.userId}
        traineeName={trainee.name}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmed={(result) => {
          setSignoff({
            id: result.id,
            confirmedAt: result.confirmedAt,
            notes: null,
            supervisorName: "You",
          })
          setIsModalOpen(false)
        }}
      />
    </main>
  )
}
