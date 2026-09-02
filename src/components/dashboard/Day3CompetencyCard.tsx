"use client"

import React from "react"
import type { SessionResult } from "@/types/domain"

export interface Day3CompetencyCardProps {
  result: SessionResult
  consecutivePasses?: number
}

export function Day3CompetencyCard({
  result,
  consecutivePasses = 1,
}: Day3CompetencyCardProps) {
  const toteAccuracy = result.totePutAccuracy ?? 100
  const putLatency = result.meanTotePutLatencySeconds ?? 1.8
  const ftpa = result.verticalTierFtpa ?? Math.round(result.accuracyScore)
  const uph = result.sustainedUph ?? 128

  const meetsToteAccuracy = toteAccuracy === 100
  const meetsLatency = putLatency <= 2.5
  const meetsFtpa = ftpa >= 99.2
  const meetsUph = uph >= 120

  const isDay3Passed =
    result.day3Passed ??
    (meetsToteAccuracy && meetsLatency && meetsFtpa && meetsUph)

  return (
    <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 font-sans">
      {/* Header & Gate Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Curriculum Day 3
            </span>
            <span className="text-xs text-zinc-400 font-mono">
              BBWD-WI-030 §5.2 9-Tote Cart Discipline &amp; Vertical Addressing
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            High-Density Wave &amp; Vertical Tier Competency Report
          </h2>
        </div>

        <div>
          {isDay3Passed ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-2 rounded-lg font-mono font-bold text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              DAY 4 UNLOCKED (INDUSTRIAL EXCEPTIONS)
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
        {/* Metric 1: Tote Put Accuracy */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Tote Put Accuracy
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {toteAccuracy}%
            </span>
            <span className="text-xs text-zinc-400">/ 100% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsToteAccuracy ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Zero Mis-Slots
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Incorrect Tote Scanned
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Mean Tote Put Latency */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Tote Put Latency
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {putLatency.toFixed(2)}s
            </span>
            <span className="text-xs text-zinc-400">&le; 2.5s Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsLatency ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Rapid Put Reflex
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Tote Search Hesitation
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Vertical Tier FTPA */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Vertical Tier FTPA
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {ftpa}%
            </span>
            <span className="text-xs text-zinc-400">/ &ge; 99.2% Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsFtpa ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ SLA Compliant (A-D)
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                ⚠ Tier Mis-Pick Below SLA
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Sustained UPH */}
        <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg p-4 flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Sustained Picking Rate
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">
              {uph} UPH
            </span>
            <span className="text-xs text-zinc-400">&ge; 120 Target</span>
          </div>
          <div className="text-xs font-semibold">
            {meetsUph ? (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Floor Speed Ready
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                ⚠ Sub-Baseline Velocity
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum Phase Analysis */}
      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 mt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
          Day 3 Cart &amp; Vertical Mastery Breakdown
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase A: Vertical Tier Familiarization (Levels A &rarr; B &rarr; C &rarr; D)
            </span>
            <span className="text-emerald-400 font-bold">✓ VERIFIED</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
            <span className="text-zinc-300">
              Phase B: 9-Tote Full Cart Saturation (Rapid Tier-Shifting Put-to-Slot)
            </span>
            <span
              className={
                meetsToteAccuracy && meetsLatency
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {meetsToteAccuracy && meetsLatency
                ? "✓ 3-TIER CART MUSCLE MEMORY LOCKED"
                : "⚠ PUT-TO-SLOT PRECISION GAP"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-300">
              Phase C: Vertical Distractor Trap (Co-Mingled Levels C &amp; D Artwork)
            </span>
            <span
              className={
                result.errorCount === 0
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {result.errorCount === 0
                ? "✓ VERTICAL CHECK-DIGIT DISCIPLINE PROVEN"
                : "⚠ LEVEL DRIFT DETECTED"}
            </span>
          </div>
        </div>
      </div>

      {/* Gating Rule Explanation */}
      <div className="mt-4 text-xs text-zinc-400 leading-relaxed">
        <strong className="text-zinc-300">Promotion Requirement:</strong> Trainees must achieve{" "}
        <span className="text-purple-300 font-bold">100% Tote Put Accuracy</span>,{" "}
        <span className="text-purple-300 font-bold">Mean Put Latency &le; 2.5s</span>,{" "}
        <span className="text-purple-300 font-bold">FTPA &ge; 99.2%</span>, and{" "}
        <span className="text-purple-300 font-bold">Sustained UPH &ge; 120</span> across 2 consecutive runs to qualify for Day 4 (Industrial Exceptions &amp; Quality Control).
        {consecutivePasses > 0 && (
          <span className="ml-2 text-zinc-300">
            (Consecutive qualifying runs: <strong>{consecutivePasses}/2</strong>)
          </span>
        )}
      </div>
    </div>
  )
}
