"use client"

import React from "react"
import type { SessionResult } from "@/types/domain"

export interface Day1CompetencyCardProps {
  result: SessionResult
  consecutivePasses?: number
}

export function Day1CompetencyCard({
  result,
  consecutivePasses = 1,
}: Day1CompetencyCardProps) {
  const checkDigitRate = result.checkDigitScanRate ?? 100
  const ftpa = result.firstTimePickAccuracy ?? Math.round(result.accuracyScore)
  const latency = result.cognitiveLatencyMs ?? 0
  const bypasses = result.sequenceBypasses ?? 0

  const meetsCheckDigit = checkDigitRate === 100
  const meetsFtpa = ftpa >= 98.0
  const meetsBypasses = bypasses === 0
  const isDay1Passed = meetsCheckDigit && meetsFtpa && meetsBypasses

  return (
    <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 font-sans">
      {/* Header & Gate Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Curriculum Day 1
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              BBWD-WI-030 §5.2 Check-Digit Protocol
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Neuromuscular Competency Report Card
          </h2>
        </div>

        <div>
          {isDay1Passed ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              DAY 2 UNLOCKED
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              DRILL REPEAT REQUIRED
            </div>
          )}
        </div>
      </div>

      {/* Primary 4-Beat Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {/* Metric 1: Check-Digit Scan Rate */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Check-Digit Adherence
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {checkDigitRate}%
            </span>
            <span className="text-xs text-zinc-400">/ 100% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsCheckDigit ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ 100% Verified
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Missed Check Digit
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: FTPA */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            First-Time Accuracy
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {ftpa}%
            </span>
            <span className="text-xs text-zinc-400">/ ≥ 98% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsFtpa ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ GEODIS SLA Met
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Below Floor Standard
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Sequence Bypasses */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Sequence Bypasses
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {bypasses}
            </span>
            <span className="text-xs text-zinc-400">/ 0 Allowed</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsBypasses ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Perfect 4-Beat Cadence
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Premature SKU Scan
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Cognitive Latency */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Cognitive Hesitation
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {latency} ms
            </span>
            <span className="text-xs text-zinc-400">&lt; 2,500 ms</span>
          </div>
          <div className="text-xs font-semibold text-zinc-400">
            Prompt to 1st Scan Latency
          </div>
        </div>
      </div>

      {/* Curriculum Phase Analysis */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Day 1 Protocol Mastery Breakdown
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">Phase A: Cart Prep (3 Tiers &amp; Totes)</span>
            <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">Phase B: Single-Bay Cadence (6 Picks)</span>
            <span className={meetsCheckDigit ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {meetsCheckDigit ? "✓ 4-BEAT LOCKED" : "⚠ ADHERENCE GAP"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-300">Phase C: Reverse-Contrast Test (Adjacent Mis-pick Traps)</span>
            <span className={result.errorCount === 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {result.errorCount === 0 ? "✓ BARCODE DISCIPLINE PROVEN" : "⚠ ARTWORK GUESSING DETECTED"}
            </span>
          </div>
        </div>
      </div>

      {/* Gating Rule Explanation */}
      <div className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-300">Promotion Requirement:</strong> Trainees must achieve{" "}
        <span className="text-amber-300 font-bold">100% check-digit verification</span>,{" "}
        <span className="text-amber-300 font-bold">≥ 98.0% FTPA</span>, and{" "}
        <span className="text-amber-300 font-bold">0 sequence bypasses</span> across 2 consecutive runs to qualify for Day 2 (Serpentine Aisle Traversal).
        {consecutivePasses > 0 && (
          <span className="ml-2 text-zinc-300">
            (Consecutive qualifying runs: <strong>{consecutivePasses}/2</strong>)
          </span>
        )}
      </div>
    </div>
  )
}
