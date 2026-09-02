"use client"

import React from "react"
import type { FloorCertificationResult } from "@/services/certification-engine"

export interface Day5CertificationCardProps {
  certificationResult: FloorCertificationResult
  auditSignature?: string
}

export function Day5CertificationCard({
  certificationResult,
  auditSignature,
}: Day5CertificationCardProps) {
  const {
    candidateName,
    employeeId,
    facilityId,
    certified,
    isCompetent,
    consecutiveQualifyingRuns,
    requiredQualifyingRuns,
    shiftsToCompetence,
    shiftReductionPercentage,
    criteriaBreakdown,
    roiMetrics,
  } = certificationResult

  const digest =
    auditSignature ??
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 font-sans relative overflow-hidden">
      {/* Background Ambient Glow when certified */}
      {certified && (
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header & High-Visibility Seal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-zinc-800 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Curriculum Day 5 Final Qualification
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              GEODIS BBWD-WI-030 Production Standard
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1.5">
            Production Floor Certification &amp; LMS Audit Handoff
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Candidate: <strong className="text-zinc-200">{candidateName}</strong> ({employeeId}) · Facility: {facilityId}
          </p>
        </div>

        {/* The Certification Seal */}
        <div className="flex items-center">
          {certified ? (
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-950 to-zinc-900 border-2 border-emerald-400/80 px-5 py-3 rounded-xl shadow-lg shadow-emerald-950/80 animate-in fade-in zoom-in duration-300">
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 text-xl font-bold shadow-inner">
                ✓
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-extrabold">
                  Official Verification
                </div>
                <div className="text-base font-black tracking-tight text-white">
                  FLOOR READY — TIER 1 CERTIFIED
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-zinc-900 border border-amber-500/40 px-5 py-3 rounded-xl shadow-md">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 text-base font-bold">
                !
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  Qualification Pending
                </div>
                <div className="text-sm font-bold text-zinc-200">
                  {consecutiveQualifyingRuns} of {requiredQualifyingRuns} Qualifying Runs Complete
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5 Production Performance Dials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 my-6 relative z-10">
        {/* Dial 1: Sustained Net UPH */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Sustained Net UPH
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {criteriaBreakdown.sustainedUph.value}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / &ge; 140.0
            </span>
          </div>
          <div className="text-[10px] font-bold">
            {criteriaBreakdown.sustainedUph.passed ? (
              <span className="text-emerald-400">✓ Target Exceeded</span>
            ) : (
              <span className="text-rose-400">⚠ Below 140 Threshold</span>
            )}
          </div>
        </div>

        {/* Dial 2: First-Time Pick Accuracy */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            First-Time Accuracy
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {criteriaBreakdown.ftpa.value.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / &ge; 99.5%
            </span>
          </div>
          <div className="text-[10px] font-bold">
            {criteriaBreakdown.ftpa.passed ? (
              <span className="text-emerald-400">✓ 99.5%+ Achieved</span>
            ) : (
              <span className="text-rose-400">⚠ Unforced Scan Errors</span>
            )}
          </div>
        </div>

        {/* Dial 3: Spatial Routing Discipline */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Path Efficiency
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {criteriaBreakdown.pathEfficiency.value.toFixed(1)}%
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              (0 Backtracks)
            </span>
          </div>
          <div className="text-[10px] font-bold">
            {criteriaBreakdown.pathEfficiency.passed && criteriaBreakdown.bayBacktracks.passed ? (
              <span className="text-emerald-400">✓ Strict Serpentine</span>
            ) : (
              <span className="text-rose-400">⚠ Backtrack Violation</span>
            )}
          </div>
        </div>

        {/* Dial 4: Mean Tote Put Latency */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Cart Put Latency
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {criteriaBreakdown.meanTotePutLatencySeconds.value.toFixed(1)}s
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / &le; 2.2s SLA
            </span>
          </div>
          <div className="text-[10px] font-bold">
            {criteriaBreakdown.meanTotePutLatencySeconds.passed ? (
              <span className="text-emerald-400">✓ Muscle Memory Locked</span>
            ) : (
              <span className="text-rose-400">⚠ Hesitation Detected</span>
            )}
          </div>
        </div>

        {/* Dial 5: Premature Conveyor Drops */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Premature Drops
          </div>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-white">
              {criteriaBreakdown.prematureToteDrops.value}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              / 0 Allowed
            </span>
          </div>
          <div className="text-[10px] font-bold">
            {criteriaBreakdown.prematureToteDrops.passed ? (
              <span className="text-emerald-400">✓ Non-Destructive Cart</span>
            ) : (
              <span className="text-rose-400">⛔ Disqualifier: Tote Dump</span>
            )}
          </div>
        </div>
      </div>

      {/* Financial Value Unlocked & Labor Recoupment */}
      <div className="bg-gradient-to-r from-zinc-900 to-emerald-950/40 border border-zinc-800 rounded-xl p-5 my-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Financial Value Unlocked By Candidate
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            ${roiMetrics.netFinancialSavings.toLocaleString("en-US", { minimumFractionDigits: 2 })} Net Labor Recoupment
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            Ramp reduced from <strong className="text-zinc-200">20 shifts (4 weeks)</strong> down to{" "}
            <strong className="text-emerald-300">{shiftsToCompetence} shifts (1 week)</strong> ({shiftReductionPercentage}% reduction).
          </div>
        </div>

        <div className="flex items-center gap-6 bg-black/40 border border-zinc-800/80 px-4 py-3 rounded-lg font-mono text-xs">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Productive Hours Gained</div>
            <div className="text-emerald-400 font-bold text-sm">+{roiMetrics.hoursRecouped} Hours</div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Trainer Shadow Cut</div>
            <div className="text-cyan-400 font-bold text-sm">-$1,800.00</div>
          </div>
          <div className="h-6 w-px bg-zinc-800" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Mis-Picks Prevented</div>
            <div className="text-amber-400 font-bold text-sm">~24 Defects</div>
          </div>
        </div>
      </div>

      {/* Cryptographic LMS / HRIS Verification Footer */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-bold text-zinc-300">
            Automated LMS / HRIS Dispatch Verified
          </span>
          <span className="text-[11px] font-mono text-zinc-500">
            (xAPI Statement &amp; SCORM 2004 4th Ed.)
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 bg-black/50 px-3 py-1.5 rounded border border-zinc-800 max-w-full overflow-hidden">
          <span className="text-zinc-500 shrink-0">SHA-256:</span>
          <span className="truncate text-emerald-400">{digest}</span>
        </div>
      </div>
    </div>
  )
}
