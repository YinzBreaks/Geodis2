/**
 * supervisor-client.tsx — Client component for supervisor dashboard
 *
 * Renders the four dashboard sections with interactive components
 * (charts, scroll areas) that require "use client".
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { TraineeCard } from "@/components/dashboard/TraineeCard"
import { ExceptionHeatmap } from "@/components/dashboard/ExceptionHeatmap"
import { ScoreTrendChart, type ScoreDataPoint } from "@/components/dashboard/ScoreTrendChart"
import { CoachingFlagQueue } from "@/components/dashboard/CoachingFlagQueue"
import type { ExceptionStats, FloorReadyGap } from "@/lib/floorReadiness"
import type {
  CohortTraineeOverview,
  CohortTrendPoint,
} from "@/services/reporting/cohort-reporting"
import type { CoachingFlagSummary } from "@/services/reporting/coaching-flag-reporting"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SupervisorDashboardClientProps {
  trainees: CohortTraineeOverview[]
  cohortExceptionCoverage: Record<string, ExceptionStats>
  trendData: CohortTrendPoint[]
  initialCoachingFlags: CoachingFlagSummary[]
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Client-side rendering for the supervisor dashboard. */
export function SupervisorDashboardClient({
  trainees,
  cohortExceptionCoverage,
  trendData,
  initialCoachingFlags,
}: SupervisorDashboardClientProps) {
  const router = useRouter()
  const [coachingState, setCoachingState] = useState<
    Record<string, "saving" | "saved" | "error">
  >({})

  const createCoachingFlag = useCallback(
    async (trainee: CohortTraineeOverview) => {
      setCoachingState((state) => ({ ...state, [trainee.userId]: "saving" }))
      const sourceGap = trainee.report.gaps[0]?.criterion
      try {
        const response = await fetch("/api/coaching-flags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            traineeId: trainee.userId,
            category: "READINESS_GAP",
            reason:
              trainee.report.needsAttentionReason ??
              sourceGap ??
              "Supervisor coaching review requested",
            sourceGap,
          }),
        })
        if (!response.ok && response.status !== 409) {
          throw new Error(`HTTP ${response.status}`)
        }
        setCoachingState((state) => ({ ...state, [trainee.userId]: "saved" }))
        router.refresh()
      } catch {
        setCoachingState((state) => ({ ...state, [trainee.userId]: "error" }))
      }
    },
    [router]
  )

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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700 }}>
            Supervisor Dashboard
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 13, marginTop: 4 }}>
            {trainees.length} trainee{trainees.length !== 1 ? "s" : ""} at
            facility
          </p>
        </div>
        <a
          href="/api/dashboard/supervisor/export"
          className="rounded border border-slate-600 px-3 py-2 text-xs font-mono text-slate-200 hover:border-amber-400 hover:text-amber-200"
        >
          Export CSV
        </a>
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

      <CoachingFlagQueue initialFlags={initialCoachingFlags} />

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
                    onClick={() => void createCoachingFlag(t)}
                    disabled={coachingState[t.userId] === "saving" || coachingState[t.userId] === "saved"}
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
                    {coachingState[t.userId] === "saving"
                      ? "Saving..."
                      : coachingState[t.userId] === "saved"
                        ? "Coaching Flag Open"
                        : coachingState[t.userId] === "error"
                          ? "Retry Coaching Flag"
                          : "Open Coaching Flag"}
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
