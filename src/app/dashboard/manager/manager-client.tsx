/**
 * manager-client.tsx — Client component for Warehouse Manager dashboard
 *
 * Aggregate-only view. No individual trainee names.
 * 4 KPI cards, weekly signoffs bar chart, exception failure rates bar chart.
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type {
  ManagerKPIs,
  WeeklySignoff,
  ExceptionFailureRate,
} from "./page"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ManagerDashboardClientProps {
  managerName: string
  facilityId: string
  kpis: ManagerKPIs
  weeklySignoffs: WeeklySignoff[]
  exceptionFailureRates: ExceptionFailureRate[]
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  suffix,
  description,
}: {
  label: string
  value: string
  suffix?: string
  description?: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-wider">
        {label}
      </p>
      <p className="text-zinc-100 font-mono text-3xl font-bold mt-1">
        {value}
        {suffix && (
          <span className="text-zinc-400 text-lg ml-1">{suffix}</span>
        )}
      </p>
      {description && (
        <p className="text-zinc-600 font-mono text-[10px] mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipPayload {
  value: number
  name: string
  payload: Record<string, unknown>
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-zinc-300 font-mono text-xs font-bold">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-zinc-400 font-mono text-xs">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Warehouse Manager aggregate dashboard. */
export function ManagerDashboardClient({
  managerName,
  facilityId,
  kpis,
  weeklySignoffs,
  exceptionFailureRates,
}: ManagerDashboardClientProps) {
  // Color exception bars by failure rate
  function getBarColor(failureRate: number): string {
    if (failureRate >= 0.3) return "#ef4444" // red
    if (failureRate >= 0.1) return "#f59e0b" // amber
    return "#22c55e" // green
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-zinc-100 font-mono text-2xl font-bold">
          Warehouse Manager Dashboard
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          {managerName} · Facility: {facilityId}
        </p>
      </header>

      {/* A. KPI CARDS */}
      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Active Trainees"
            value={String(kpis.activeTrainees)}
            description="Currently in training program"
          />
          <KPICard
            label="Avg Score (30d)"
            value={String(kpis.avgFinalScore)}
            suffix="/100"
            description="Completed simulations, last 30 days"
          />
          <KPICard
            label="Floor Ready Rate"
            value={`${Math.round(kpis.floorReadyRate * 100)}`}
            suffix="%"
            description="Signed-off / total trainees"
          />
          <KPICard
            label="Avg Days to Ready"
            value={kpis.avgDaysToReady !== null ? String(kpis.avgDaysToReady) : "—"}
            suffix={kpis.avgDaysToReady !== null ? "days" : ""}
            description="First session → floor-ready signoff"
          />
        </div>
      </section>

      {/* B. WEEKLY SIGNOFFS BAR CHART */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Weekly Floor-Ready Signoffs (Last 8 Weeks)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklySignoffs}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Signoffs" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* C. EXCEPTION FAILURE RATES */}
      <section className="mb-8">
        <h2 className="text-zinc-400 font-mono text-sm uppercase tracking-wider mb-3">
          Exception Failure Rates (Last 30 Days)
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={exceptionFailureRates}
              layout="vertical"
              margin={{ left: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fill: "#71717a", fontSize: 11, fontFamily: "monospace" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                width={110}
              />
              <Tooltip
                content={<CustomTooltip />}
              />
              <Bar dataKey="failureRate" name="Failure Rate" radius={[0, 4, 4, 0]}>
                {exceptionFailureRates.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.failureRate)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* D. LEGEND / CONTEXT */}
      <section>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-500">
          <p>
            <strong className="text-zinc-400">Goal:</strong> Reduce onboarding from 4 weeks to
            ≤2 weeks. The floor-ready rate measures confirmed supervisor signoffs.
          </p>
          <p className="mt-1">
            <strong className="text-zinc-400">Exception colors:</strong>{" "}
            <span className="text-green-400">Green (&lt;10%)</span> ·{" "}
            <span className="text-yellow-400">Amber (10–29%)</span> ·{" "}
            <span className="text-red-400">Red (≥30%)</span> failure rate.
          </p>
        </div>
      </section>
    </main>
  )
}
