/**
 * supervisor-client.tsx — Client component for supervisor dashboard
 *
 * Renders the four dashboard sections with interactive components
 * (charts, scroll areas) that require "use client".
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { TraineeCard } from "@/components/dashboard/TraineeCard"
import { ExceptionHeatmap } from "@/components/dashboard/ExceptionHeatmap"
import { ScoreTrendChart, type ScoreDataPoint } from "@/components/dashboard/ScoreTrendChart"
import type { ExceptionStats, FloorReadyGap } from "@/lib/floorReadiness"
import type { TraineeOverview, CohortTrendPoint } from "./page"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SupervisorDashboardClientProps {
  trainees: TraineeOverview[]
  cohortExceptionCoverage: Record<string, ExceptionStats>
  trendData: CohortTrendPoint[]
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Client-side rendering for the supervisor dashboard. */
export function SupervisorDashboardClient({
  trainees,
  cohortExceptionCoverage,
  trendData,
}: SupervisorDashboardClientProps) {
  // Needs attention: NEEDS_COACHING trainees sorted by most sessions without improvement
  const needsAttention = trainees
    .filter((t) => t.report.status === "NEEDS_COACHING")
    .sort((a, b) => b.sessionsCompleted - a.sessionsCompleted)

  // Convert trend data to chart format
  const chartData: ScoreDataPoint[] = trendData.map((d) => ({
    label: d.date,
    score: d.avgScore,
    accuracy: d.avgAccuracy,
    passRate: d.passRate,
  }))

  return (
    <main className="min-h-screen bg-zinc-950 p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-zinc-100 font-mono text-2xl font-bold">
          Supervisor Dashboard
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          {trainees.length} trainee{trainees.length !== 1 ? "s" : ""} at
          facility
        </p>
      </div>

      {/* A. COHORT OVERVIEW ROW */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Trainee Overview
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-700">
          {trainees.map((t) => (
            <TraineeCard
              key={t.userId}
              userId={t.userId}
              name={t.name}
              employeeId={t.employeeId}
              floorReadyStatus={t.report.status}
              bestScore={t.bestScore}
              sessionsCompleted={t.sessionsCompleted}
              sessionsRequired={t.sessionsRequired}
              lastActive={t.lastActive ? new Date(t.lastActive) : null}
              gaps={t.report.gaps}
            />
          ))}
          {trainees.length === 0 && (
            <p className="text-zinc-600 font-mono text-sm py-8">
              No trainees at this facility yet.
            </p>
          )}
        </div>
      </section>

      {/* B. EXCEPTION HEATMAP */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Exception Heatmap (All Trainees)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ExceptionHeatmap coverage={cohortExceptionCoverage} />
        </div>
      </section>

      {/* C. COHORT TREND CHART */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Cohort Trend (28 Days)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ScoreTrendChart
            data={chartData}
            threshold={75}
            showAccuracy={true}
            showPassRate={true}
            title="Avg Final Score · Accuracy · Pass Rate %"
            height={280}
          />
        </div>
      </section>

      {/* D. NEEDS ATTENTION LIST */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Needs Attention
        </h2>
        {needsAttention.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-600 font-mono text-sm text-center">
              No trainees currently flagged for coaching.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {needsAttention.map((t) => {
              const topGap: FloorReadyGap | undefined = t.report.gaps[0]
              const daysInTraining = Math.ceil(
                (Date.now() - new Date(t.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )

              return (
                <div
                  key={t.userId}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-4"
                >
                  <div className="flex-1">
                    <p className="text-zinc-200 font-mono text-sm font-semibold">
                      {t.name}
                    </p>
                    <p className="text-zinc-500 font-mono text-xs">
                      {topGap
                        ? `Top gap: ${topGap.criterion} (${topGap.current})`
                        : "Multiple gaps identified"}
                    </p>
                  </div>
                  <span className="text-zinc-500 font-mono text-xs">
                    {daysInTraining}d in training
                  </span>
                  <span className="text-zinc-500 font-mono text-xs">
                    {t.sessionsCompleted} sessions
                  </span>
                  <button className="px-3 py-1.5 bg-yellow-800/50 hover:bg-yellow-700/50 text-yellow-300 font-mono text-xs rounded-lg transition-colors">
                    Schedule Coaching
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
