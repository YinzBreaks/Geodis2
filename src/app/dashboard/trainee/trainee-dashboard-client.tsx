/**
 * trainee-dashboard-client.tsx — Trainee's own progress dashboard
 *
 * Five sections:
 *   1. Floor-Ready Status   — "Am I ready for the floor yet?"
 *   2. What to Do Next      — single recommended action / CTA
 *   3. My Scores            — scenario cards with score sparklines
 *   4. Exception Practice   — all 8 §6 exception types with resolution rates
 *   5. Session History      — compact table with replay links
 *
 * Light theme throughout — not the terminal dark palette.
 * Monospace only for score numbers and RF device references.
 * Never shows "FAILED" — always "NOT YET" or "NEEDS PRACTICE".
 *
 * Per CLAUDE.md §Architecture: components render and delegate — zero business logic.
 */
"use client"

import Link from "next/link"
import type { FloorReadyStatus, FloorReadyGap, ExceptionStats, ScoreTrend } from "@/lib/floorReadiness"
import { ScanResult } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES (used by page.tsx for server → client serialization)
// ─────────────────────────────────────────────────────────────────────────────

/** Serialized FloorReadinessReport — Date fields converted to ISO strings. */
export interface SerializedFloorReadinessReport {
  status: FloorReadyStatus
  gaps: FloorReadyGap[]
  suggestedAt?: string | null
  confirmedAt?: string | null
  confirmedBy?: string
  exceptionCoverage: Record<string, ExceptionStats>
  scoreHistory: number[]
  trend: ScoreTrend
}

/** Session data passed from server — dates serialized as ISO strings. */
export interface TraineeDashboardSession {
  id: string
  moduleId: string
  difficulty: string
  status: string
  finalScore: number | null
  accuracyScore: number | null
  speedScore: number | null
  passed: boolean | null
  totalPicks: number | null
  errorCount: number | null
  errors: unknown
  scanEvents: unknown
  startedAt: string
  completedAt: string | null
  totalTimeMs: number | null
}

interface TraineeDashboardClientProps {
  sessions: TraineeDashboardSession[]
  floorReport: SerializedFloorReadinessReport
  user: { name: string; email: string; facilityId: string }
  signoff: { confirmedAt: string; supervisorName: string } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** All 8 exception types from BBWD-WI-030 §6, in display order. */
const ALL_EXCEPTION_KEYS: readonly string[] = [
  ScanResult.TOTE_ALLOCATED,
  ScanResult.CART_ALLOCATED,
  ScanResult.WRONG_LOCATION,
  ScanResult.WRONG_TOTE,
  ScanResult.WRONG_ITEM,
  ScanResult.ITEM_NOT_FOUND,
  ScanResult.ITEM_DAMAGED,
  ScanResult.TIMEOUT,
] as const

/** Friendly names for each exception type — per BBWD-WI-030 §6. */
const EXCEPTION_FRIENDLY: Record<string, string> = {
  [ScanResult.TOTE_ALLOCATED]: "Tote Already In Use",
  [ScanResult.CART_ALLOCATED]: "Cart Already Built",
  [ScanResult.WRONG_LOCATION]: "Wrong Shelf Location",
  [ScanResult.WRONG_TOTE]: "Wrong Tote",
  [ScanResult.WRONG_ITEM]: "Wrong Item",
  [ScanResult.ITEM_NOT_FOUND]: "Not Enough Stock",
  [ScanResult.ITEM_DAMAGED]: "Damaged Item",
  [ScanResult.TIMEOUT]: "Scan Timeout",
}

/** Map a moduleId to a human-readable scenario title. */
const SCENARIO_TITLE_MAP: Record<string, string> = {
  "sim-01-beginner": "Zone 1 — Beginner",
  "sim-02-intermediate": "Zone 1 — Intermediate",
  "sim-03-advanced": "Zone 1 — Advanced",
  "Z1_20_PICKS": "Zone 1 — 20 Picks",
  "Z1_9_PICKS": "Zone 1 — 9 Picks",
  "Z2_20_PICKS": "Zone 2 — 20 Picks",
  "HAZ_10_PICKS": "HAZ — 10 Picks",
  "FEX_15_PICKS": "Express — 15 Picks",
}

/** Derive a readable title from a moduleId when not in the map. */
function scenarioTitle(moduleId: string): string {
  if (moduleId in SCENARIO_TITLE_MAP) return SCENARIO_TITLE_MAP[moduleId]
  return moduleId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// SPARKLINE (pure SVG — no external library)
// ─────────────────────────────────────────────────────────────────────────────

interface SparklineProps {
  scores: number[]
  width?: number
  height?: number
}

/** Tiny inline SVG trend line from the last N scores. */
function Sparkline({ scores, width = 64, height = 22 }: SparklineProps) {
  if (scores.length < 2) {
    return (
      <span className="text-xs text-slate-400 font-mono">—</span>
    )
  }

  const last = scores.slice(-5)
  const min = Math.min(...last)
  const max = Math.max(...last)
  const range = max - min || 1

  const points = last
    .map((score, i) => {
      const x = (i / (last.length - 1)) * (width - 4) + 2
      const y = height - 2 - ((score - min) / range) * (height - 4)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  const trending = last[last.length - 1] >= last[0]
  const stroke = trending ? "#f0a500" : "#f85149"

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block align-middle"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO GROUPING
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioGroup {
  moduleId: string
  title: string
  difficulty: string
  attempts: number
  bestScore: number
  passed: boolean
  lastAttemptAt: string | null
  recentScores: number[]
}

/** Group completed sessions by moduleId, computing per-scenario stats. */
function groupByScenario(sessions: TraineeDashboardSession[]): ScenarioGroup[] {
  const map = new Map<string, TraineeDashboardSession[]>()

  for (const s of sessions) {
    if (s.status !== "COMPLETED") continue
    const existing = map.get(s.moduleId) ?? []
    existing.push(s)
    map.set(s.moduleId, existing)
  }

  const groups: ScenarioGroup[] = []

  for (const [moduleId, sList] of Array.from(map.entries())) {
    // Sort chronologically for sparkline
    const sorted = [...sList].sort(
      (a, b) =>
        new Date(a.completedAt ?? a.startedAt).getTime() -
        new Date(b.completedAt ?? b.startedAt).getTime()
    )
    const passed = sList.some((s) => s.passed === true)
    const bestScore = sList.reduce(
      (max: number, s: TraineeDashboardSession) => Math.max(max, s.finalScore ?? 0),
      0
    )
    const recentScores = sorted
      .slice(-5)
      .map((s) => s.finalScore ?? 0)

    // Most recent attempt date
    const sortedDesc = [...sList].sort(
      (a, b) =>
        new Date(b.completedAt ?? b.startedAt).getTime() -
        new Date(a.completedAt ?? a.startedAt).getTime()
    )
    const lastAttemptAt = sortedDesc[0]?.completedAt ?? sortedDesc[0]?.startedAt ?? null

    groups.push({
      moduleId,
      title: scenarioTitle(moduleId),
      difficulty: sList[0]?.difficulty ?? "BEGINNER",
      attempts: sList.length,
      bestScore,
      passed,
      lastAttemptAt,
      recentScores,
    })
  }

  // Sort: passed first, then by most recent attempt
  return groups.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1
    const aDate = a.lastAttemptAt ? new Date(a.lastAttemptAt).getTime() : 0
    const bDate = b.lastAttemptAt ? new Date(b.lastAttemptAt).getTime() : 0
    return bDate - aDate
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// WHAT TO DO NEXT LOGIC
// ─────────────────────────────────────────────────────────────────────────────

interface NextAction {
  headline: string
  body: string
  buttonLabel: string | null
  href: string | null
}

/** Derive a single recommended next action from session history and floor report. */
function getNextAction(
  sessions: TraineeDashboardSession[],
  floorReport: SerializedFloorReadinessReport
): NextAction {
  const completed = sessions.filter((s) => s.status === "COMPLETED")

  if (completed.length === 0) {
    return {
      headline: "Start Here: Zone 1 Beginner (9 picks)",
      body: "Begin with the basics. This simulation walks you through a standard Zone 1 pick round step by step.",
      buttonLabel: "Start Training →",
      href: "/sim",
    }
  }

  const passedBeginner = completed.some(
    (s) => s.difficulty === "BEGINNER" && s.passed === true
  )
  const intermediateSessions = completed.filter((s) => s.difficulty === "INTERMEDIATE")
  const passedIntermediate = intermediateSessions.some((s) => s.passed === true)
  const advancedSessions = completed.filter((s) => s.difficulty === "ADVANCED")
  const passedAdvanced = advancedSessions.some((s) => s.passed === true)

  // Still working on beginner
  if (!passedBeginner) {
    return {
      headline: "Keep going — you're getting there!",
      body: "Practice Zone 1 Beginner again. Each attempt builds your muscle memory for the RF Device workflow.",
      buttonLabel: "Try Again →",
      href: "/sim",
    }
  }

  // Passed beginner, haven't tried intermediate yet
  if (passedBeginner && intermediateSessions.length === 0) {
    return {
      headline: "Ready to level up! Try Zone 1 Intermediate",
      body: "You've nailed the basics. Intermediate adds more picks and introduces the exception-handling scenarios you'll face on the floor.",
      buttonLabel: "Try Intermediate →",
      href: "/sim",
    }
  }

  // Failed intermediate 2+ times → suggest weakest exception
  if (!passedIntermediate && intermediateSessions.length >= 2) {
    const coverage = floorReport.exceptionCoverage
    let worstException = "exception handling"
    let worstRate = 1

    for (const [key, stats] of Object.entries(coverage)) {
      if (stats.encountered > 0 && stats.resolutionRate < worstRate) {
        worstRate = stats.resolutionRate
        worstException = EXCEPTION_FRIENDLY[key] ?? key
      }
    }

    return {
      headline: "Let's practice the tricky parts first",
      body: `Your scores are improving, but "${worstException}" is still catching you out. Practice that scenario before your next full attempt.`,
      buttonLabel: "Practice This Scenario →",
      href: "/sim",
    }
  }

  // Still working on intermediate
  if (!passedIntermediate) {
    return {
      headline: "Almost there — try Intermediate again",
      body: "Review the exception-handling procedures in SOP §6 before your next attempt. You're improving!",
      buttonLabel: "Try Intermediate →",
      href: "/sim",
    }
  }

  // Passed intermediate, haven't tried advanced
  if (passedIntermediate && advancedSessions.length === 0) {
    return {
      headline: "One more step — try Advanced to get floor-ready",
      body: "You're almost there! Advanced has tighter time limits and more exception scenarios — it's the final hurdle before supervisor sign-off.",
      buttonLabel: "Try Advanced →",
      href: "/sim",
    }
  }

  // Still working on advanced
  if (!passedAdvanced) {
    return {
      headline: "Keep pushing — Advanced is the last step",
      body: "Review your exception practice tracker below for any gaps, then try Advanced again. You've got this!",
      buttonLabel: "Try Advanced →",
      href: "/sim",
    }
  }

  // All sims passed — floor-ready, waiting for signoff
  return {
    headline: "You're done! Waiting for supervisor sign-off.",
    body: "All simulations complete. Your supervisor will review your progress scores and sign you off for the floor.",
    buttonLabel: null,
    href: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLD CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string
  label: string
  detail: string
  met: boolean
}

/** Build a human-readable threshold checklist from session history and gaps. */
function buildChecklist(
  sessions: TraineeDashboardSession[],
  floorReport: SerializedFloorReadinessReport
): ChecklistItem[] {
  const completed = sessions.filter((s) => s.status === "COMPLETED")
  const passed = completed.filter((s) => s.passed === true)
  const gaps = floorReport.gaps

  // Latest completed session for score checks
  const sortedDesc = [...completed].sort(
    (a, b) =>
      new Date(b.completedAt ?? b.startedAt).getTime() -
      new Date(a.completedAt ?? a.startedAt).getTime()
  )
  const latest = sortedDesc[0]

  const hasGap = (keyword: string) =>
    gaps.some((g) => g.criterion.toLowerCase().includes(keyword.toLowerCase()))

  return [
    {
      id: "sims",
      label: "Complete 3 simulations",
      detail: `${passed.length} passed so far`,
      met: !hasGap("passed simulations") && passed.length >= 3,
    },
    {
      id: "beginner",
      label: "Pass BEGINNER difficulty",
      detail: completed.some((s) => s.difficulty === "BEGINNER" && s.passed)
        ? "✓ Passed"
        : "Not yet",
      met: completed.some((s) => s.difficulty === "BEGINNER" && s.passed === true),
    },
    {
      id: "intermediate",
      label: "Pass INTERMEDIATE difficulty",
      detail: completed.some((s) => s.difficulty === "INTERMEDIATE" && s.passed)
        ? "✓ Passed"
        : "Not yet",
      met: completed.some((s) => s.difficulty === "INTERMEDIATE" && s.passed === true),
    },
    {
      id: "advanced",
      label: "Pass ADVANCED difficulty",
      detail: completed.some((s) => s.difficulty === "ADVANCED" && s.passed)
        ? "✓ Passed"
        : "Not yet",
      met: !hasGap("ADVANCED simulation"),
    },
    {
      id: "accuracy",
      label: "Score 80+ on accuracy",
      detail: latest
        ? `Your best: ${Math.round(latest.accuracyScore ?? 0)}`
        : "No sessions yet",
      met: !hasGap("Accuracy score"),
    },
    {
      id: "exceptions",
      label: "Resolve all 8 exception types",
      detail: hasGap("exception types")
        ? "Not all types seen yet"
        : "✓ All covered",
      met: !hasGap("exception types") && !hasGap("exception resolution"),
    },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — FLOOR-READY STATUS
// ─────────────────────────────────────────────────────────────────────────────

interface FloorReadyStatusSectionProps {
  sessions: TraineeDashboardSession[]
  floorReport: SerializedFloorReadinessReport
  signoff: { confirmedAt: string; supervisorName: string } | null
}

function FloorReadyStatusSection({
  sessions,
  floorReport,
  signoff,
}: FloorReadyStatusSectionProps) {
  const { status, gaps } = floorReport
  const checklist = buildChecklist(sessions, floorReport)
  const metCount = checklist.filter((c) => c.met).length
  const totalCount = checklist.length

  // ── Confirmed sign-off ─────────────────────────────────────────────────────
  if (signoff) {
    const date = new Date(signoff.confirmedAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    return (
      <section
        aria-labelledby="floor-ready-heading"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <p className="text-xs font-mono uppercase tracking-widest text-emerald-600 mb-2">
          MY PROGRESS
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">✅</span>
          <h2 id="floor-ready-heading" className="text-2xl font-bold text-emerald-800">
            Floor Ready — Signed Off
          </h2>
        </div>
        <p className="text-emerald-700 text-sm">
          Signed off on{" "}
          <span className="font-mono font-semibold">{date}</span> by{" "}
          <span className="font-semibold">{signoff.supervisorName}</span>.
          Congratulations — you&apos;re cleared for the floor!
        </p>
      </section>
    )
  }

  // ── Floor-ready, awaiting signoff ─────────────────────────────────────────
  if (status === "FLOOR_READY") {
    return (
      <section
        aria-labelledby="floor-ready-heading"
        className="rounded-xl border border-green-200 bg-green-50 p-6"
      >
        <p className="text-xs font-mono uppercase tracking-widest text-green-600 mb-2">
          MY PROGRESS
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎉</span>
          <h2 id="floor-ready-heading" className="text-2xl font-bold text-green-800">
            You&apos;re Ready for the Floor!
          </h2>
        </div>
        <p className="text-green-700 text-sm mb-4">
          You&apos;ve met all the training thresholds. Your supervisor will review your
          scores and sign you off.
        </p>
        <ul className="space-y-1.5">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm text-green-800">
              <span className="text-green-600 font-bold w-4 shrink-0">✓</span>
              <span>{item.label}</span>
              <span className="text-green-600 font-mono text-xs ml-auto">
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  // ── NEEDS_COACHING ─────────────────────────────────────────────────────────
  if (status === "NEEDS_COACHING") {
    return (
      <section
        aria-labelledby="floor-ready-heading"
        className="rounded-xl border border-amber-200 bg-amber-50 p-6"
      >
        <p className="text-xs font-mono uppercase tracking-widest text-amber-600 mb-2">
          MY PROGRESS
        </p>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚠️</span>
          <h2 id="floor-ready-heading" className="text-xl font-bold text-amber-800">
            A few areas need more practice
          </h2>
        </div>
        <p className="text-amber-700 text-sm mb-4">
          Your supervisor has been notified and may reach out to schedule some
          coaching time. Keep practicing — every attempt counts!
        </p>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${(metCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-amber-700 shrink-0">
            {metCount}/{totalCount} met
          </span>
        </div>

        <ChecklistDisplay items={checklist} gapStyle="amber" />

        {gaps.length > 0 && (
          <p className="mt-3 text-xs text-amber-600">
            Focus area:{" "}
            <span className="font-semibold">{gaps[0]?.actionable}</span>
          </p>
        )}
      </section>
    )
  }

  // ── IN_PROGRESS (default) ─────────────────────────────────────────────────
  return (
    <section
      aria-labelledby="floor-ready-heading"
      className="rounded-xl border border-slate-200 bg-white p-6"
    >
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
        MY PROGRESS
      </p>
      <div className="flex items-center justify-between mb-4">
        <h2 id="floor-ready-heading" className="text-xl font-bold text-slate-800">
          Keep going — you&apos;re making progress!
        </h2>
        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {metCount} of {totalCount} thresholds met
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${(metCount / totalCount) * 100}%` }}
        />
      </div>

      <ChecklistDisplay items={checklist} gapStyle="neutral" />
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKLIST DISPLAY (shared by multiple states)
// ─────────────────────────────────────────────────────────────────────────────

interface ChecklistDisplayProps {
  items: ChecklistItem[]
  gapStyle: "amber" | "neutral"
}

function ChecklistDisplay({ items, gapStyle }: ChecklistDisplayProps) {
  const unmetColor =
    gapStyle === "amber" ? "text-amber-700" : "text-slate-500"
  const unmetIcon =
    gapStyle === "amber" ? "⚠" : "✗"
  const unmetIconColor =
    gapStyle === "amber" ? "text-amber-500" : "text-red-400"

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-2 text-sm"
        >
          <span
            className={`w-4 shrink-0 font-bold mt-0.5 ${
              item.met ? "text-green-600" : unmetIconColor
            }`}
          >
            {item.met ? "✓" : unmetIcon}
          </span>
          <span
            className={item.met ? "text-slate-700" : unmetColor}
          >
            {item.label}
          </span>
          <span
            className={`ml-auto font-mono text-xs shrink-0 ${
              item.met ? "text-green-600" : "text-slate-400"
            }`}
          >
            {item.detail}
          </span>
        </li>
      ))}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — WHAT TO DO NEXT
// ─────────────────────────────────────────────────────────────────────────────

interface WhatNextSectionProps {
  sessions: TraineeDashboardSession[]
  floorReport: SerializedFloorReadinessReport
  signoff: { confirmedAt: string; supervisorName: string } | null
}

function WhatNextSection({ sessions, floorReport, signoff }: WhatNextSectionProps) {
  // Already signed off — no CTA needed
  if (signoff) return null

  const action = getNextAction(sessions, floorReport)

  return (
    <section aria-labelledby="next-action-heading" className="rounded-xl border p-6" style={{ borderColor: 'rgba(240,165,0,0.25)', backgroundColor: 'rgba(240,165,0,0.06)' }}>
      <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#b37800' }}>
        WHAT TO DO NEXT
      </p>
      <h2 id="next-action-heading" className="text-lg font-bold mb-1" style={{ color: '#3d2800', fontFamily: 'var(--font-display)' }}>
        {action.headline}
      </h2>
      <p className="text-sm mb-4" style={{ color: '#7a5000' }}>{action.body}</p>

      {action.buttonLabel && action.href && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#f0a500', color: '#0d1117', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}
        >
          {action.buttonLabel}
        </Link>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — MY SCORES
// ─────────────────────────────────────────────────────────────────────────────

interface ScoresSectionProps {
  sessions: TraineeDashboardSession[]
}

function ScoresSection({ sessions }: ScoresSectionProps) {
  const groups = groupByScenario(sessions)

  const difficultyBadge: Record<
    string,
    { label: string; bg: string; text: string }
  > = {
    BEGINNER: { label: "Beginner", bg: "bg-green-100", text: "text-green-700" },
    INTERMEDIATE: { label: "Intermediate", bg: "bg-blue-100", text: "text-blue-700" },
    ADVANCED: { label: "Advanced", bg: "bg-purple-100", text: "text-purple-700" },
  }

  return (
    <section aria-labelledby="scores-heading">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
        MY SCORES
      </p>
      <h2 id="scores-heading" className="sr-only">My Scores</h2>

      {groups.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">
          No completed simulations yet — start your first one above!
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {groups.map((group) => {
            const badge =
              difficultyBadge[group.difficulty] ??
              difficultyBadge.BEGINNER

            return (
              <div
                key={group.moduleId}
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
              >
                {/* Title + difficulty */}
                <div>
                  <p className="text-slate-800 font-semibold text-sm leading-snug">
                    {group.title}
                  </p>
                  <span
                    className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Best score — monospace */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                      Best score
                    </p>
                    <p className="text-3xl font-mono font-bold text-slate-800">
                      {Math.round(group.bestScore)}
                    </p>
                  </div>

                  {/* Sparkline */}
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">trend</p>
                    <Sparkline scores={group.recentScores} />
                  </div>
                </div>

                {/* Pass/fail badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                      group.passed
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {group.passed ? "PASSED" : "NOT YET"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {group.attempts}{" "}
                    {group.attempts === 1 ? "attempt" : "attempts"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — EXCEPTION PRACTICE TRACKER
// ─────────────────────────────────────────────────────────────────────────────

interface ExceptionTrackerSectionProps {
  exceptionCoverage: Record<string, ExceptionStats>
}

function ExceptionTrackerSection({ exceptionCoverage }: ExceptionTrackerSectionProps) {
  function rateIcon(rate: number, encountered: number): string {
    if (encountered === 0) return "—"
    if (rate >= 0.9) return "🟢"
    if (rate >= 0.7) return "🟡"
    return "🔴"
  }

  function rateColor(rate: number, encountered: number): string {
    if (encountered === 0) return "text-slate-400"
    if (rate >= 0.9) return "text-green-700"
    if (rate >= 0.7) return "text-amber-600"
    return "text-red-600"
  }

  return (
    <section aria-labelledby="exceptions-heading">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">
        EXCEPTION PRACTICE
      </p>
      <h2 id="exceptions-heading" className="text-slate-800 font-semibold text-base mb-1">
        Tricky situations you&apos;ll face on the floor
      </h2>
      <p className="text-slate-500 text-sm mb-4">
        Here&apos;s how you&apos;re handling each one:
      </p>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Exception
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Seen
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Resolved
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rate
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 w-10">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {ALL_EXCEPTION_KEYS.map((key, idx) => {
                const stats = exceptionCoverage[key] ?? {
                  encountered: 0,
                  resolvedCorrectly: 0,
                  resolutionRate: 0,
                }
                const friendlyName = EXCEPTION_FRIENDLY[key] ?? key
                const notSeen = stats.encountered === 0

                return (
                  <tr
                    key={key}
                    className={`${
                      idx < ALL_EXCEPTION_KEYS.length - 1
                        ? "border-b border-slate-100"
                        : ""
                    } hover:bg-slate-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {friendlyName}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-600">
                      {notSeen ? (
                        <span className="text-slate-300">0</span>
                      ) : (
                        stats.encountered
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-slate-600">
                      {notSeen ? (
                        <span className="text-slate-300">0</span>
                      ) : (
                        stats.resolvedCorrectly
                      )}
                    </td>
                    <td
                      className={`px-3 py-3 text-center font-mono font-semibold ${rateColor(
                        stats.resolutionRate,
                        stats.encountered
                      )}`}
                    >
                      {notSeen ? (
                        <span className="text-slate-300 font-normal text-xs">
                          Not encountered yet
                        </span>
                      ) : (
                        `${Math.round(stats.resolutionRate * 100)}%`
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {rateIcon(stats.resolutionRate, stats.encountered)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400 italic">
        Errors are part of training — every picker learns these the same way.
        Every attempt counts toward floor-ready.
      </p>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — SESSION HISTORY
// ─────────────────────────────────────────────────────────────────────────────

interface SessionHistorySectionProps {
  sessions: TraineeDashboardSession[]
}

function SessionHistorySection({ sessions }: SessionHistorySectionProps) {
  if (sessions.length === 0) {
    return (
      <section aria-labelledby="history-heading" className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">
          SESSION HISTORY
        </p>
        <p className="text-slate-500 text-sm">
          No sessions yet — start your first simulation above!
        </p>
        <p className="text-2xl mt-2">↑</p>
      </section>
    )
  }

  // Sort newest first
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  )

  return (
    <section aria-labelledby="history-heading">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-4">
        SESSION HISTORY
      </p>
      <h2 id="history-heading" className="sr-only">Session History</h2>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Scenario
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Difficulty
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Score
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Result
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Duration
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Replay
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, idx) => {
                const date = new Date(s.startedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
                const durationSecs = s.totalTimeMs
                  ? Math.round(s.totalTimeMs / 1000)
                  : null
                const durationStr = durationSecs
                  ? `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`
                  : "—"

                const diffBadge: Record<
                  string,
                  { short: string; color: string }
                > = {
                  BEGINNER: { short: "BEG", color: "text-green-700" },
                  INTERMEDIATE: { short: "INT", color: "text-blue-700" },
                  ADVANCED: { short: "ADV", color: "text-purple-700" },
                }
                const diff =
                  diffBadge[s.difficulty] ?? { short: s.difficulty.slice(0, 3), color: "text-slate-600" }

                const isLast = idx === sorted.length - 1

                return (
                  <tr
                    key={s.id}
                    className={`${
                      !isLast ? "border-b border-slate-100" : ""
                    } hover:bg-slate-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {date}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[180px]">
                      <span className="truncate block">{scenarioTitle(s.moduleId)}</span>
                    </td>
                    <td className={`px-3 py-3 text-center font-mono text-xs font-semibold ${diff.color}`}>
                      {diff.short}
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-800">
                      {s.finalScore !== null ? Math.round(s.finalScore) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.status === "COMPLETED" ? (
                        <span
                          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                            s.passed
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.passed ? "PASSED" : "NOT YET"}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          {s.status.toLowerCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">
                      {durationStr}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {s.status === "COMPLETED" ? (
                        <Link
                          href={`/dashboard/supervisor/replay/${s.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          View
                        </Link>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CLIENT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Main trainee dashboard client — renders all five sections. */
export function TraineeDashboardClient({
  sessions,
  floorReport,
  user,
  signoff,
}: TraineeDashboardClientProps) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#f0f4f8" }}
    >
      {/* Page header */}
      <div className="border-b bg-white" style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{ fontFamily: 'var(--font-mono)', color: '#f0a500', letterSpacing: '0.08em' }}>
            WarehousePro Training
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#0d1117', fontFamily: 'var(--font-display)' }}>
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#64748b', fontFamily: 'var(--font-ui)' }}>
            Here&apos;s where you stand today.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* Section 1: Floor-Ready Status */}
        <FloorReadyStatusSection
          sessions={sessions}
          floorReport={floorReport}
          signoff={signoff}
        />

        {/* Section 2: What to Do Next */}
        <WhatNextSection
          sessions={sessions}
          floorReport={floorReport}
          signoff={signoff}
        />

        {/* Section 3: My Scores */}
        <ScoresSection sessions={sessions} />

        {/* Section 4: Exception Practice Tracker */}
        <ExceptionTrackerSection
          exceptionCoverage={floorReport.exceptionCoverage}
        />

        {/* Section 5: Session History */}
        <SessionHistorySection sessions={sessions} />

        {/* Footer */}
        <p className="text-center text-xs pb-4" style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          WarehousePro — GEODIS Training Platform &middot; {user.facilityId}
        </p>
      </div>
    </div>
  )
}
