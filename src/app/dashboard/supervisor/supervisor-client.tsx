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
    <main className="min-h-screen p-6" style={{ backgroundColor: "var(--color-base)" }}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>
          Supervisor Dashboard
        </h1>
        <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 13, marginTop: 4 }}>
          {trainees.length} trainee{trainees.length !== 1 ? "s" : ""} at
          facility
        </p>
      </div>

      {/* A. COHORT OVERVIEW ROW */}
      <section className="mb-8">
        <h2 style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Trainee Overview
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-3">
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
            <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 13, padding: "32px 0" }}>
              No trainees at this facility yet.
            </p>
          )}
        </div>
      </section>

      {/* B. EXCEPTION HEATMAP */}
      <section className="mb-8">
        <h2 style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Exception Heatmap (All Trainees)
        </h2>
        <div style={{ backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
          <ExceptionHeatmap coverage={cohortExceptionCoverage} />
        </div>
      </section>

      {/* C. COHORT TREND CHART */}
      <section className="mb-8">
        <h2 style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Cohort Trend (28 Days)
        </h2>
        <div style={{ backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 16 }}>
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
        <h2 style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Needs Attention
        </h2>
        {needsAttention.length === 0 ? (
          <div style={{ backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 13, textAlign: "center" }}>
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
                  style={{
                    backgroundColor: "var(--color-surface-1)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600 }}>
                      {t.name}
                    </p>
                    <p style={{ color: "var(--color-danger)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {t.report.needsAttentionReason
                        ? t.report.needsAttentionReason
                        : topGap
                          ? `Top gap: ${topGap.criterion} (${topGap.current})`
                          : "Multiple gaps identified"}
                    </p>
                  </div>
                  <span style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {daysInTraining}d in training
                  </span>
                  <span style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {t.sessionsCompleted} sessions
                  </span>
                  <button
                    style={{
                      padding: "6px 12px",
                      backgroundColor: "rgba(240, 165, 0, 0.15)",
                      color: "var(--color-amber)",
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1px solid rgba(240, 165, 0, 0.3)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                    }}
                  >
                    Schedule Coaching
                  </button>
                  <a
                    href={`/dashboard/supervisor/trainee/${t.userId}`}
                    style={{
                      padding: "6px 12px",
                      color: "var(--color-text-secondary)",
                      fontFamily: "var(--font-display)",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    View Sessions →
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
