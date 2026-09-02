"use client"

import React, { useState } from "react"
import { ROI_CONSTANTS, CERTIFICATION_THRESHOLDS } from "@/services/certification-engine"

export interface CohortCandidate {
  name: string
  employeeId: string
  currentDay: number
  consecutiveRuns: number
  sustainedUph: number
  ftpa: number
  status: "CERTIFIED" | "IN_DRILL" | "REMEDIAL"
  certifiedAt?: string
  auditDigest?: string
}

const DEFAULT_COHORT: CohortCandidate[] = [
  {
    name: "Marcus Vance",
    employeeId: "EMP-41092",
    currentDay: 5,
    consecutiveRuns: 2,
    sustainedUph: 146.4,
    ftpa: 99.8,
    status: "CERTIFIED",
    certifiedAt: "2026-09-02T16:45:00Z",
    auditDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    name: "Elena Rostova",
    employeeId: "EMP-41095",
    currentDay: 5,
    consecutiveRuns: 2,
    sustainedUph: 142.1,
    ftpa: 99.6,
    status: "CERTIFIED",
    certifiedAt: "2026-09-02T17:15:00Z",
    auditDigest: "8f481e4b3c2c13a40498a9c394747738b55639b740523e32eef5a0de792b0c34",
  },
  {
    name: "Devon Washington",
    employeeId: "EMP-41103",
    currentDay: 5,
    consecutiveRuns: 1,
    sustainedUph: 141.0,
    ftpa: 98.4,
    status: "IN_DRILL",
  },
  {
    name: "Sophia Chen",
    employeeId: "EMP-41112",
    currentDay: 4,
    consecutiveRuns: 0,
    sustainedUph: 133.5,
    ftpa: 97.2,
    status: "IN_DRILL",
  },
  {
    name: "Jordan Alvarez",
    employeeId: "EMP-41118",
    currentDay: 3,
    consecutiveRuns: 0,
    sustainedUph: 118.0,
    ftpa: 94.0,
    status: "REMEDIAL",
  },
]

export function ExecutiveRoiPanel() {
  const [annualHires, setAnnualHires] = useState(120)
  const [cohort, setCohort] = useState<CohortCandidate[]>(DEFAULT_COHORT)

  const certifiedCount = cohort.filter((c) => c.status === "CERTIFIED").length
  const totalFinancialRecoupment = annualHires * ROI_CONSTANTS.TOTAL_NET_SAVINGS_PER_HEAD
  const totalHoursRecouped = annualHires * ROI_CONSTANTS.PRODUCTIVE_HOURS_GAINED

  const handleExportCsv = () => {
    const headers = [
      "Candidate Name",
      "Employee ID",
      "Current Curriculum Day",
      "Consecutive Qualifying Runs",
      "Sustained UPH",
      "FTPA (%)",
      "Certification Status",
      "Shifts to Competence",
      "Productive Hours Recouped",
      "Net Financial Savings (USD)",
      "Audit SHA-256 Digest",
    ]

    const rows = cohort.map((c) => [
      `"${c.name}"`,
      `"${c.employeeId}"`,
      c.currentDay,
      c.consecutiveRuns,
      c.sustainedUph,
      c.ftpa,
      `"${c.status}"`,
      c.status === "CERTIFIED" ? "5.0" : "20.0 (In Progress)",
      c.status === "CERTIFIED" ? "102.0" : "0.0",
      c.status === "CERTIFIED" ? "$4,398.00" : "$0.00",
      `"${c.auditDigest ?? "PENDING_CERTIFICATION"}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `GEODIS_C_Suite_ROI_Audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-zinc-100 font-sans">
      {/* Header with Export CTA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              C-Suite Executive ROI
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              GEODIS Labor Acceleration &amp; LMS Handoff
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            WarehousePro Floor Competency &amp; Financial Recoupment
          </h2>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 transition-all cursor-pointer"
        >
          <span>📥</span> Export C-Suite Audit CSV
        </button>
      </div>

      {/* 4 Headline KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Shifts to Competence */}
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Ramp Duration
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-mono text-emerald-400">
              5.0
            </span>
            <span className="text-xs text-zinc-400 font-mono ml-1.5">
              Shifts (1 Wk)
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Baseline: 20.0 Shifts (4 Wks)</span>
            <span className="text-emerald-400 font-bold">-75% Time</span>
          </div>
        </div>

        {/* KPI 2: Floor Hours Recouped */}
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Hours Recouped / Head
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-mono text-cyan-400">
              102.0
            </span>
            <span className="text-xs text-zinc-400 font-mono ml-1.5">
              Floor Hours
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>+12.8 Productive Shifts</span>
            <span className="text-cyan-400 font-bold">100% Floor Net</span>
          </div>
        </div>

        {/* KPI 3: Net Savings Per Qualified Head */}
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Net Savings / Head
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-mono text-amber-400">
              $4,398
            </span>
            <span className="text-xs text-zinc-400 font-mono ml-1.5">
              USD / Associate
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Trainer Shadow + Wages + Defect Avoidance</span>
          </div>
        </div>

        {/* KPI 4: Annual Facility Projection */}
        <div className="bg-zinc-900/70 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between bg-gradient-to-br from-zinc-900/90 to-emerald-950/20">
          <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
            Facility Annual Recoupment
          </div>
          <div className="my-2">
            <span className="text-3xl font-black font-mono text-white">
              ${totalFinancialRecoupment.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Based on {annualHires} annual hires</span>
            <span className="text-emerald-400 font-bold">Audit-Proven</span>
          </div>
        </div>
      </div>

      {/* Interactive Annual Volume Slider */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Annual Facility Hiring Volume Calibration
          </span>
          <span className="text-xs text-zinc-400">
            Adjust the projected new-hire volume to model annualized warehouse labor recoupment.
          </span>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <input
            type="range"
            min={20}
            max={500}
            step={10}
            value={annualHires}
            onChange={(e) => setAnnualHires(Number(e.target.value))}
            className="w-48 accent-emerald-500 cursor-pointer"
          />
          <span className="font-mono text-sm font-bold text-white bg-zinc-800 px-3 py-1 rounded border border-zinc-700 min-w-[70px] text-center">
            {annualHires} Hires
          </span>
        </div>
      </div>

      {/* Cohort Qualification Velocity Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Active Cohort Certification Velocity (5-Day Pipeline)
          </h3>
          <span className="text-xs font-mono text-zinc-400">
            {certifiedCount} of {cohort.length} Associates Tier-1 Floor Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900 text-zinc-400 font-mono uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <th className="p-3">Candidate</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3 text-center">Curriculum Day</th>
                <th className="p-3 text-center">Consecutive Runs</th>
                <th className="p-3 text-right">Sustained UPH</th>
                <th className="p-3 text-right">FTPA %</th>
                <th className="p-3 text-center">Qualification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono">
              {cohort.map((candidate) => (
                <tr
                  key={candidate.employeeId}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="p-3 font-sans font-medium text-white">
                    {candidate.name}
                  </td>
                  <td className="p-3 text-zinc-400">{candidate.employeeId}</td>
                  <td className="p-3 text-center text-zinc-300">
                    Day {candidate.currentDay} / 5
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={
                        candidate.consecutiveRuns >= 2
                          ? "text-emerald-400 font-bold"
                          : "text-amber-400"
                      }
                    >
                      {candidate.consecutiveRuns} / 2
                    </span>
                  </td>
                  <td className="p-3 text-right text-zinc-200">
                    {candidate.sustainedUph.toFixed(1)}
                  </td>
                  <td className="p-3 text-right text-zinc-200">
                    {candidate.ftpa.toFixed(1)}%
                  </td>
                  <td className="p-3 text-center">
                    {candidate.status === "CERTIFIED" && (
                      <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        TIER 1 CERTIFIED
                      </span>
                    )}
                    {candidate.status === "IN_DRILL" && (
                      <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        IN-DRILL PROGRESS
                      </span>
                    )}
                    {candidate.status === "REMEDIAL" && (
                      <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        REMEDIAL REVIEW
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
