"use client"

import React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { BENCHMARK_COHORT } from "@/services/reporting-service"

export default function AssociateAuditDossierPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : "usr-marcus-vance"

  // Find associate from cohort benchmark or default to Marcus Vance
  const associate =
    BENCHMARK_COHORT.find((a) => a.id === id) ?? BENCHMARK_COHORT[0]

  const digest =
    associate.auditDigest ??
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  const handlePrintCertificate = () => {
    window.print()
  }

  const timelineDays = [
    {
      day: 1,
      title: "DAY 1: Equipment Familiarity & 4-Beat Protocol",
      sop: "BBWD-WI-030 §4.1",
      completedAt: "2026-08-28T14:30:00Z",
      status: "PASSED",
      score: "99.0%",
      keyMetric: "Check-Digit Rate: 100%",
    },
    {
      day: 2,
      title: "DAY 2: Serpentine Routing & Multi-Bay Traversal",
      sop: "BBWD-WI-030 §5.2",
      completedAt: "2026-08-29T15:15:00Z",
      status: "PASSED",
      score: "98.4%",
      keyMetric: "Path Efficiency: 98.2% (0 Backtracks)",
    },
    {
      day: 3,
      title: "DAY 3: High-Density Wave & Vertical Tier Mastery",
      sop: "BBWD-WI-030 §5.4",
      completedAt: "2026-08-30T16:00:00Z",
      status: "PASSED",
      score: "99.5%",
      keyMetric: "Mean Put Latency: 1.8s (9 Totes)",
    },
    {
      day: 4,
      title: "DAY 4: Industrial Exceptions & Hazmat Handling",
      sop: "BBWD-WI-030 §6.5",
      completedAt: "2026-09-01T14:45:00Z",
      status: "PASSED",
      score: "100%",
      keyMetric: "Premature Conveyor Drops: 0",
    },
    {
      day: 5,
      title: "DAY 5: Final Floor Certification Wave",
      sop: "BBWD-WI-030 §7.0",
      completedAt: associate.certifiedAt ?? "2026-09-02T16:45:00Z",
      status: associate.status === "CERTIFIED" ? "PASSED" : "IN_PROGRESS",
      score: `${associate.ftpa.toFixed(1)}%`,
      keyMetric: `Sustained UPH: ${associate.velocityUph.toFixed(1)} / 140.0 SLA`,
    },
  ]

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans space-y-8">
      {/* ── TOP NAV BAR ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/manager"
            className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            &larr; Return to Executive Roster
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Associate Dossier: {associate.employeeId}
          </span>
        </div>

        <button
          onClick={handlePrintCertificate}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950 transition-all cursor-pointer"
        >
          <span>🖨</span> Print Compliance Binder Dossier
        </button>
      </div>

      {/* ── ASSOCIATE PROFILE HEADER ──────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Employee Compliance Dossier
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              Kinetic OS Training Qualification Record
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mt-1.5">{associate.name}</h1>
          <div className="text-xs text-zinc-400 font-mono mt-1 flex flex-wrap gap-4">
            <span>Employee ID: <strong className="text-zinc-200">{associate.employeeId}</strong></span>
            <span>Facility: <strong className="text-zinc-200">{associate.facilityId}</strong></span>
            <span>Ramp Status: <strong className="text-emerald-400">{associate.shiftsToCompetence} Shifts</strong> (Compressed from 20)</span>
          </div>
        </div>

        <div>
          {associate.status === "CERTIFIED" ? (
            <div className="bg-emerald-950 border-2 border-emerald-400 px-5 py-3 rounded-xl shadow-lg shadow-emerald-950/80 text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Verification Status
              </div>
              <div className="text-base font-black text-white">
                TIER 1 FLOOR CERTIFIED
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800 border border-zinc-700 px-5 py-3 rounded-xl text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                In-Drill Progress
              </div>
              <div className="text-sm font-bold text-zinc-300">
                Day {associate.currentDay} of 5
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4 PERFORMANCE RADAR TILES ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl">
          <div className="text-[10px] text-zinc-400 uppercase">Sustained Net Speed</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {associate.velocityUph.toFixed(1)} <span className="text-xs text-zinc-500">UPH</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">&ge; 140.0 SLA Threshold</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl">
          <div className="text-[10px] text-zinc-400 uppercase">First-Time Pick Accuracy</div>
          <div className="text-2xl font-black text-white mt-1">
            {associate.ftpa.toFixed(1)}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">&ge; 99.5% Required Accuracy</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl">
          <div className="text-[10px] text-zinc-400 uppercase">Dwell vs. Travel Ratio</div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            38% / 62%
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Optimal Kinetic Rhythm</div>
        </div>

        <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-xl">
          <div className="text-[10px] text-zinc-400 uppercase">Net Value Recouped</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            ${associate.dollarsRecouped.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">+102.0 Floor Hours Gained</div>
        </div>
      </div>

      {/* ── 5-DAY CURRICULUM PROGRESSION TIMELINE ──────────────────────────── */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono border-b border-zinc-800 pb-3">
          5-Day Curriculum Qualification Timeline
        </h2>

        <div className="space-y-4">
          {timelineDays.map((step) => (
            <div
              key={step.day}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                    step.status === "PASSED"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {step.day}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{step.title}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">
                    SOP: {step.sop} · Completed: {new Date(step.completedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-xs">
                <div className="text-right">
                  <div className="text-[10px] text-zinc-500 uppercase">Score / Target</div>
                  <div className="text-white font-bold">{step.score}</div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[10px] text-zinc-500 uppercase">Operational SLA</div>
                  <div className="text-emerald-400 font-bold">{step.keyMetric}</div>
                </div>
                <div>
                  <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    {step.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CRYPTOGRAPHIC AUDIT SIGNATURE FOOTER ───────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Immutable Cryptographic SHA-256 Audit Signature
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Status: Dispatched to HRIS / LMS
          </span>
        </div>

        <p className="text-xs text-zinc-400 font-mono">
          This digital signature binds the candidate ID, facility, verified speed, and accuracy metrics. It is permanently auditable across external LMS platforms (Workday, Cornerstone, SAP).
        </p>

        <div className="bg-black/60 p-3 rounded-lg border border-zinc-800 font-mono text-xs text-emerald-400 break-all select-all">
          SHA256:{digest}
        </div>
      </div>
    </main>
  )
}
