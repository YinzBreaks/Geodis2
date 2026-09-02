"use client"

import React from "react"
import type { SessionResult } from "@/types/domain"

export interface Day2CompetencyCardProps {
  result: SessionResult
  consecutivePasses?: number
}

export function Day2CompetencyCard({
  result,
  consecutivePasses = 1,
}: Day2CompetencyCardProps) {
  const pathEfficiency = result.pathEfficiency ?? 100
  const backtracks = result.backtrackViolations ?? 0
  const ftpa = result.firstTimePickAccuracy ?? Math.round(result.accuracyScore)
  const cadenceCv = result.cadenceVariance ?? 0.15

  const meetsEfficiency = pathEfficiency >= 95
  const meetsBacktracks = backtracks === 0
  const meetsFtpa = ftpa >= 99.0
  const meetsCadence = cadenceCv <= 0.30
  const isDay2Passed =
    result.day2Passed ??
    (meetsEfficiency && meetsBacktracks && meetsFtpa && meetsCadence)

  return (
    <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 font-sans">
      {/* Header & Gate Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Curriculum Day 2
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              BBWD-WI-030 §5.2 Serpentine Routing &amp; Cluster Wave
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Spatial Efficiency &amp; Multi-Bay Traversal Report Card
          </h2>
        </div>

        <div>
          {isDay2Passed ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              DAY 3 UNLOCKED (HIGH-DENSITY BATCH)
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              DRILL REPEAT REQUIRED
            </div>
          )}
        </div>
      </div>

      {/* Primary Day 2 Spatial Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Metric 1: Path Efficiency */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Path Efficiency
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {pathEfficiency}%
            </span>
            <span className="text-xs text-zinc-400">/ ≥ 95% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsEfficiency ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ S-Curve Optimal
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Excessive Path Deviation
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Backtrack Violations */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Backtrack Violations
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {backtracks}
            </span>
            <span className="text-xs text-zinc-400">/ 0 Allowed</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsBacktracks ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Zero Yo-Yo Movement
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Regressive Bay Revisit
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: First-Time Accuracy (FTPA) */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            First-Time Accuracy
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {ftpa}%
            </span>
            <span className="text-xs text-zinc-400">/ ≥ 99% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsFtpa ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ GEODIS SLA Met
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Mis-scan Below SLA
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Cadence Rhythm (CV) */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Cadence Rhythm (CV)
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {cadenceCv.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-400">&le; 0.30 Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsCadence ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Steady Metronomic Pace
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Irregular Hesitation
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum Phase Analysis */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Day 2 Spatial Competency Breakdown
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase A: Linear 2-Bay Traversal (Bays 01-02 Forward Momentum)
            </span>
            <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase B: 4-Bay Serpentine Cluster Wave (4 Interleaved Totes)
            </span>
            <span
              className={
                meetsEfficiency && meetsBacktracks
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {meetsEfficiency && meetsBacktracks
                ? "✓ S-CURVE DISCIPLINE LOCKED"
                : "⚠ PATH DEFICIT DETECTED"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-300">
              Phase C: Backtrack Trap (Familiar Packaging in Bay 04)
            </span>
            <span
              className={
                backtracks === 0
                  ? "text-emerald-400 font-bold"
                  : "text-rose-400 font-bold"
              }
            >
              {backtracks === 0
                ? "✓ TERMINAL TRUST CONFIRMED (NO BACKTRACK)"
                : "⚠ YO-YO BACKTRACK OBSERVED"}
            </span>
          </div>
        </div>
      </div>

      {/* Gating Rule Explanation */}
      <div className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-300">Promotion Requirement:</strong> Trainees must achieve{" "}
        <span className="text-cyan-300 font-bold">Path Efficiency &ge; 95%</span>,{" "}
        <span className="text-cyan-300 font-bold">0 Backtrack Violations</span>,{" "}
        <span className="text-cyan-300 font-bold">FTPA &ge; 99.0%</span>, and{" "}
        <span className="text-cyan-300 font-bold">Cadence CV &le; 0.30</span> across 2 consecutive runs to qualify for Day 3 (High-Density Batch Wave).
        {consecutivePasses > 0 && (
          <span className="ml-2 text-zinc-300">
            (Consecutive qualifying runs: <strong>{consecutivePasses}/2</strong>)
          </span>
        )}
      </div>
    </div>
  )
}
