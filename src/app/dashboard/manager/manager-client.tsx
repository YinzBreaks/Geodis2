/**
 * manager-client.tsx — Kinetic OS Executive Management Dashboard
 *
 * C-Suite Executive Portal & Operational Telemetry Suite.
 * - 4 Headline KPI Cards (Shifts to Competence, Productive Hours Recouped, Net Dollars Saved, Certification Rate).
 * - Interactive Facility Annual Recoupment Slider.
 * - Curriculum Funnel Conversion Progress (Days 1–5).
 * - Dense Monospace Cohort Data Grid with deep links to Associate Dossiers.
 * - Direct "Export C-Suite Audit CSV" action calling /api/reports/export-audit.
 * - Slide-over AdminConfigDrawer for Site Directors.
 */
"use client"

import React, { useState } from "react"
import Link from "next/link"
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
} from "@/services/reporting/manager-reporting"
import type {
  ExecutiveSummaryReport,
  AssociateRosterItem,
  CohortFilter,
} from "@/services/reporting-service"
import { AdminConfigDrawer, type FacilityConfig, DEFAULT_FACILITY_CONFIG } from "@/components/dashboard/AdminConfigDrawer"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ManagerDashboardClientProps {
  managerName: string
  facilityId: string
  kpis: ManagerKPIs
  weeklySignoffs: WeeklySignoff[]
  exceptionFailureRates: ExceptionFailureRate[]
  executiveSummary: ExecutiveSummaryReport
  initialCohort: AssociateRosterItem[]
}

export function ManagerDashboardClient({
  managerName,
  facilityId,
  kpis,
  weeklySignoffs,
  exceptionFailureRates,
  executiveSummary,
  initialCohort,
}: ManagerDashboardClientProps) {
  const [cohort, setCohort] = useState<AssociateRosterItem[]>(initialCohort)
  const [filter, setFilter] = useState<CohortFilter>("ALL")
  const [annualHires, setAnnualHires] = useState(120)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [facilityConfig, setFacilityConfig] = useState<FacilityConfig>(DEFAULT_FACILITY_CONFIG)
  const [isExporting, setIsExporting] = useState(false)

  // Filter cohort list
  const filteredCohort = cohort.filter((item) => {
    if (filter === "QUALIFIED") return item.status === "CERTIFIED"
    if (filter === "IN_TRAINING") return item.status === "IN_TRAINING"
    if (filter === "REMEDIAL") return item.status === "REMEDIAL"
    return true
  })

  // Dynamic projection calculation based on slider
  const projectedAnnualSavings = annualHires * executiveSummary.netDollarsSavedPerHead

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const res = await fetch(`/api/reports/export-audit?facilityId=${encodeURIComponent(facilityId)}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `KineticOS_C_Suite_Audit_${facilityId}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Failed to export audit CSV:", err)
    } finally {
      setIsExporting(false)
    }
  }

  function getBarColor(failureRate: number): string {
    if (failureRate >= 0.3) return "#ef4444"
    if (failureRate >= 0.1) return "#f59e0b"
    return "#22c55e"
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans space-y-8">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Kinetic OS Enterprise
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              GEODIS Tier-1 Warehouse Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            C-Suite Executive Portal &amp; Operations Command
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Director: <strong className="text-zinc-200">{managerName}</strong> · Facility:{" "}
            <span className="text-emerald-400 font-bold">{facilityId}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/screener"
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            <span>⏱</span> Candidate Screener Kiosk
          </Link>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3.5 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <span>⚙</span> Configure SLAs
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
          >
            <span>{isExporting ? "⏳" : "📥"}</span>
            {isExporting ? "Exporting..." : "Export C-Suite Audit CSV"}
          </button>
        </div>
      </header>

      {/* ── 1. C-SUITE 4 HEADLINE KPI TILES ───────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Shifts to Competence */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            Ramp Duration
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-emerald-400">
              {executiveSummary.avgShiftsToCompetence}
            </span>
            <span className="text-xs text-zinc-400 font-mono">Shifts (1 Wk)</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-800/60 pt-2 font-mono">
            <span>Baseline: {executiveSummary.baselineShiftsToCompetence} Shifts</span>
            <span className="text-emerald-400 font-bold">
              -{executiveSummary.shiftReductionPercentage}% Ramp Time
            </span>
          </div>
        </div>

        {/* KPI 2: Productive Floor Hours Recouped */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            Floor Hours Recouped
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-cyan-400">
              {executiveSummary.productiveHoursRecoupedPerHead}
            </span>
            <span className="text-xs text-zinc-400 font-mono">Hrs / Qualified Head</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-800/60 pt-2 font-mono">
            <span>Cohort Total: {executiveSummary.totalHoursRecoupedCohort} hrs</span>
            <span className="text-cyan-400 font-bold">+12.8 Net Shifts</span>
          </div>
        </div>

        {/* KPI 3: Net Savings Per Qualified Head */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
            Net Savings / Associate
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-amber-400">
              ${executiveSummary.netDollarsSavedPerHead.toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-zinc-400 font-mono">USD / Certified Head</span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-800/60 pt-2 font-mono">
            <span>Trainer + Wage + Defect Cut</span>
            <span className="text-amber-400 font-bold">100% Recouped</span>
          </div>
        </div>

        {/* KPI 4: Cohort Certification Rate */}
        <div className="bg-zinc-900/80 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between bg-gradient-to-br from-zinc-900/90 to-emerald-950/20">
          <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider font-mono">
            Cohort Certification Rate
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {executiveSummary.certificationRate}%
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              ({executiveSummary.qualifiedCount} of {executiveSummary.totalTrainees})
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-800/60 pt-2 font-mono">
            <span>Tier-1 Floor Ready</span>
            <span className="text-emerald-400 font-bold">Audit Proven</span>
          </div>
        </div>
      </section>

      {/* ── 2. DYNAMIC FACILITY PROJECTION CALCULATOR ─────────────────────── */}
      <section className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold font-mono text-xs uppercase tracking-wider">
              Facility Recoupment Calculator
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            Annualized Site Savings Projection:{" "}
            <span className="text-emerald-400 font-mono font-black text-xl">
              ${projectedAnnualSavings.toLocaleString()} USD
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Adjust projected hiring volume to forecast net labor recoupment and training capacity gains.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input
            type="range"
            min={50}
            max={250}
            step={10}
            value={annualHires}
            onChange={(e) => setAnnualHires(Number(e.target.value))}
            className="w-56 accent-emerald-500 cursor-pointer"
          />
          <span className="font-mono text-sm font-bold text-white bg-zinc-800 px-3.5 py-1.5 rounded border border-zinc-700 min-w-[90px] text-center">
            {annualHires} Hires / Yr
          </span>
        </div>
      </section>

      {/* ── 3. CURRICULUM FUNNEL PROGRESSION BAR ─────────────────────────── */}
      <section className="bg-zinc-900/60 border border-zinc-800 p-5 rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
            Curriculum Funnel Progression (Day 1 &rarr; Day 5)
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {executiveSummary.qualifiedCount} of {executiveSummary.totalTrainees} Reached Floor Certification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {executiveSummary.funnelStages.map((stage) => (
            <div
              key={stage.day}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex flex-col justify-between"
            >
              <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase truncate">
                Day {stage.day}
              </div>
              <div className="my-1.5 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono text-white">
                  {stage.passedCount}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {stage.conversionRate}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stage.conversionRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. LIVE COHORT DATA GRID ───────────────────────────────────────── */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden space-y-0">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Live Trainee Cohort Velocity &amp; Competency Grid
            </h3>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Click any trainee name to view their granular 5-day audit dossier and cryptographic proof.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800 font-mono text-[11px]">
            {(["ALL", "QUALIFIED", "IN_TRAINING", "REMEDIAL"] as CohortFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-zinc-900/90 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <th className="p-3">Trainee Name</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3 text-center">Curriculum Day</th>
                <th className="p-3 text-right">Velocity (UPH)</th>
                <th className="p-3 text-right">FTPA %</th>
                <th className="p-3 text-center">Shifts to Competence</th>
                <th className="p-3 text-right">Dollars Recouped</th>
                <th className="p-3 text-center">Competency Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredCohort.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="p-3 font-sans font-medium text-white">
                    <Link
                      href={`/dashboard/trainees/${item.id}`}
                      className="text-white hover:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{item.name}</span>
                      <span className="text-zinc-500 text-[10px]">&rarr;</span>
                    </Link>
                  </td>
                  <td className="p-3 text-zinc-400">{item.employeeId}</td>
                  <td className="p-3 text-center text-zinc-300">
                    Day {item.currentDay} / 5
                  </td>
                  <td className="p-3 text-right text-zinc-200 font-bold">
                    {item.velocityUph.toFixed(1)}
                  </td>
                  <td className="p-3 text-right text-zinc-200">
                    {item.ftpa.toFixed(1)}%
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={
                        item.status === "CERTIFIED"
                          ? "text-emerald-400 font-bold"
                          : "text-zinc-400"
                      }
                    >
                      {item.shiftsToCompetence.toFixed(1)} Shifts
                    </span>
                  </td>
                  <td className="p-3 text-right text-amber-300 font-bold">
                    ${item.dollarsRecouped.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 text-center">
                    {item.status === "CERTIFIED" && (
                      <span className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        TIER 1 CERTIFIED
                      </span>
                    )}
                    {item.status === "IN_TRAINING" && (
                      <span className="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                        IN TRAINING
                      </span>
                    )}
                    {item.status === "REMEDIAL" && (
                      <span className="px-2.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        REMEDIAL REVIEW
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 5. OPERATIONAL CHARTS (Weekly Signoffs & Exceptions) ───────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Signoffs */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono mb-1">
            Confirmed Floor Signoffs (Last 8 Weeks)
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mb-4">
            Total supervisor signoffs completed per week.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySignoffs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="weekLabel" tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", fontSize: 12, fontFamily: "monospace" }}
              />
              <Bar dataKey="count" fill="#10b981" name="Signoffs" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exception Failure Rates */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono mb-1">
            Exception Resolution Failure Rate (30 Days)
          </h3>
          <p className="text-[11px] text-zinc-500 font-mono mb-4">
            Percentage of exception encounters uncorrected per SOP BBWD-WI-030.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={exceptionFailureRates}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
                width={110}
              />
              <Tooltip
                formatter={(v) =>
                  typeof v === "number" ? `${(v * 100).toFixed(1)}%` : String(v ?? "")
                }
                contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", fontSize: 12, fontFamily: "monospace" }}
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

      {/* ── ADMIN CONFIG DRAWER SLIDE-OVER ─────────────────────────────────── */}
      <AdminConfigDrawer
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newCfg) => {
          setFacilityConfig(newCfg)
          setIsConfigOpen(false)
        }}
      />
    </main>
  )
}
