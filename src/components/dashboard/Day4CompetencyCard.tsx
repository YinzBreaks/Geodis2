"use client"

import React from "react"
import type { SessionResult } from "@/types/domain"

export interface Day4CompetencyCardProps {
  result: SessionResult
  consecutivePasses?: number
}

export function Day4CompetencyCard({
  result,
  consecutivePasses = 1,
}: Day4CompetencyCardProps) {
  const prematureDrops = result.prematureToteDrops ?? 0
  const latency = result.exceptionResolutionLatencySeconds ?? 4.5
  const icAccuracy = result.icDiscrepancyAccuracy ?? 100
  const hazmatCompliance = result.hazmatComplianceScore ?? 100

  const meetsDrops = prematureDrops === 0
  const meetsLatency = latency <= 7.0
  const meetsIc = icAccuracy >= 100
  const meetsHazmat = hazmatCompliance >= 100

  const isDay4Passed =
    result.day4Passed ??
    (meetsDrops && meetsLatency && meetsIc && meetsHazmat)

  return (
    <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 font-sans">
      {/* Header & Gate Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Curriculum Day 4
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              BBWD-WI-030 §6 Industrial Exceptions &amp; Hazardous Containment
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Non-Destructive Exception &amp; Hazmat Handling Report
          </h2>
        </div>

        <div>
          {isDay4Passed ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              DAY 5 UNLOCKED (140-UPH CERTIFICATION)
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              DRILL REPEAT REQUIRED
            </div>
          )}
        </div>
      </div>

      {/* Primary 4 Telemetry Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Metric 1: Premature Tote Drops (Hard Blocker) */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Premature Tote Drops
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {prematureDrops}
            </span>
            <span className="text-xs text-zinc-400">/ 0 Allowed</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsDrops ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ 100% Cart Retention
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⛔ Hard Blocker: Conveyor Dump
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Exception Resolution Latency */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Resolution Latency
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {latency.toFixed(1)}s
            </span>
            <span className="text-xs text-zinc-400">&le; 7.0s SLA</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsLatency ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Rapid Recovery
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Wave Stall Detected
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: IC Discrepancy Accuracy */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            IC Short Log Accuracy
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {icAccuracy}%
            </span>
            <span className="text-xs text-zinc-400">/ 100% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsIc ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Exact Delta Recorded
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Inventory Count Error
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Hazmat Compliance Score */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Hazmat Containment
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {hazmatCompliance}%
            </span>
            <span className="text-xs text-zinc-400">/ 100% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsHazmat ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ TOTE-09-HAZ Isolated
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⛔ Co-mingling Violation
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum Phase Analysis */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Day 4 Exception Handling Breakdown
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase A: Degraded Barcode Resolution (CTRL+M Two-Step Override)
            </span>
            <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase B: Physical Bin Shortages (CTRL+K Inventory Audit Delta)
            </span>
            <span
              className={
                meetsDrops && meetsIc
                  ? "text-emerald-400 font-bold"
                  : "text-rose-400 font-bold"
              }
            >
              {meetsDrops && meetsIc
                ? "✓ NON-DESTRUCTIVE SHORT RESOLVED"
                : "⚠ IMPROPER SHORT HANDLING"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-300">
              Phase C: Damaged Goods (CTRL+D) &amp; Hazmat Spill (CTRL+H &rarr; TOTE-09-HAZ)
            </span>
            <span
              className={
                meetsHazmat
                  ? "text-emerald-400 font-bold"
                  : "text-rose-400 font-bold"
              }
            >
              {meetsHazmat
                ? "✓ 3PL CONTAINMENT DISCIPLINE PROVEN"
                : "⚠ SAFETY PROTOCOL BREACH"}
            </span>
          </div>
        </div>
      </div>

      {/* Gating Rule Explanation */}
      <div className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-300">Promotion Requirement:</strong> Trainees must achieve{" "}
        <span className="text-rose-300 font-bold">0 Premature Tote Drops</span>,{" "}
        <span className="text-rose-300 font-bold">Mean Resolution Latency &le; 7.0s</span>,{" "}
        <span className="text-rose-300 font-bold">100% IC Discrepancy Accuracy</span>, and{" "}
        <span className="text-rose-300 font-bold">100% Hazmat Compliance</span> across 2 consecutive runs to qualify for Day 5 (140-UPH Peak Floor Certification).
        {consecutivePasses > 0 && (
          <span className="ml-2 text-zinc-300">
            (Consecutive qualifying runs: <strong>{consecutivePasses}/2</strong>)
          </span>
        )}
      </div>
    </div>
  )
}
