/**
 * /sim — Kinetic OS Workforce Velocity Simulator
 *
 * Full-bleed tablet cockpit layout (16:10 / 4:3) with 3 synchronized viewports:
 * - Viewport A: Pick Face Elevation & 9-Tote Cart
 * - Viewport B: Overhead Serpentine Traversal Map
 * - Viewport C: WMS Industrial Terminal HUD
 * - Persistent Metronomic 4-Beat Cadence Strip & Dual-Handed Thumb Zones
 */
"use client"

import { useEffect, useState } from "react"
import { useSimulation } from "@/hooks/useSimulation"
import { DifficultyLevel, type SessionResult } from "@/types/domain"
import { SCENARIO_DATA, type ScenarioBundle } from "@/data/seedData"
import { KineticCockpit } from "@/components/simulator/KineticCockpit"
import { HardwareScannerPill } from "@/components/simulator/HardwareScannerPill"

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CATALOG
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIO_OPTIONS: { key: string; levelLabel: string }[] = [
  { key: "Z1_10_PICKS", levelLabel: "BEGINNER" },
  { key: "Z1_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "Z2_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "HAZ_10_PICKS", levelLabel: "ADVANCED" },
  { key: "FEX_15_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "DAY1_EQUIPMENT_CHECK_DIGIT", levelLabel: "DAY 1 CERT" },
  { key: "DAY2_SERPENTINE_ROUTING", levelLabel: "DAY 2 CERT" },
  { key: "DAY3_HIGH_DENSITY_WAVE", levelLabel: "DAY 3 CERT" },
  { key: "DAY4_INDUSTRIAL_EXCEPTIONS", levelLabel: "DAY 4 CERT" },
  { key: "DAY5_CERTIFICATION_WAVE", levelLabel: "FINAL QUAL" },
]

export default function SimPage() {
  const {
    session,
    coaching,
    startSimulation,
    reset,
    sessionResult,
    scenarioKey,
    saveStatus,
    saveError,
    persistSession,
    processInput,
    result,
    score,
  } = useSimulation()

  // Trigger DB persistence as soon as result is ready
  useEffect(() => {
    if (sessionResult && saveStatus === "idle") {
      void persistSession()
    }
  }, [sessionResult, saveStatus, persistSession])

  // Reset session on unmount
  useEffect(() => () => reset(), [reset])

  // Results screen — shown when simulation is complete
  if (sessionResult && scenarioKey) {
    return (
      <ResultsScreen
        sessionResult={sessionResult}
        scenarioKey={scenarioKey}
        saveStatus={saveStatus}
        saveError={saveError}
        onReset={reset}
        onStartScenario={startSimulation}
      />
    )
  }

  // Active simulation — Kinetic OS Three-Viewport Cockpit
  if (session) {
    return (
      <KineticCockpit
        session={session}
        coaching={coaching}
        result={result}
        score={score}
        processInput={processInput}
        onExit={reset}
      />
    )
  }

  // Scenario selection
  return <ScenarioSelector onStart={startSimulation} />
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

type SessionBest = { bestScore: number; passed: boolean }

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "#10b981",
  INTERMEDIATE: "#f59e0b",
  ADVANCED: "#ef4444",
  "DAY 1 CERT": "#38bdf8",
  "DAY 2 CERT": "#38bdf8",
  "DAY 3 CERT": "#38bdf8",
  "DAY 4 CERT": "#a855f7",
  "FINAL QUAL": "#10b981",
}

function ScenarioSelector({ onStart }: { onStart: (key: string) => void }) {
  const [sessionBests, setSessionBests] = useState<Record<string, SessionBest>>({})

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, SessionBest>) => setSessionBests(data))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-start p-6 font-sans">
      <div className="w-full max-w-3xl space-y-6">
        {/* Header with Kinetic OS branding & Scanner Pill */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Kinetic OS v2.0
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Workforce Velocity Simulator
              </span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight mt-1">
              Industrial Training Simulator
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Select a production wave scenario to begin cadence and accuracy training.
            </p>
          </div>

          <HardwareScannerPill />
        </div>

        {/* Scenario Grid with 52px+ Glove Hit Targets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {SCENARIO_OPTIONS.map(({ key, levelLabel }) => {
            const bundle = SCENARIO_DATA[key] as ScenarioBundle | undefined
            if (!bundle) return null
            const { scenario } = bundle
            const best = sessionBests[scenario.moduleId]
            const color = DIFFICULTY_COLOR[levelLabel] ?? "#10b981"

            return (
              <button
                key={key}
                onClick={() => onStart(key)}
                className="glove-target-primary bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-left flex flex-col justify-between transition-all cursor-pointer group shadow-md"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                      {scenario.title}
                    </span>
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {levelLabel}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 font-sans line-clamp-2 mb-3">
                    {scenario.description}
                  </p>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-2.5">
                  <span>
                    <strong className="text-amber-400">{scenario.pickCount}</strong> picks · ~{scenario.estimatedMinutes} min
                  </span>
                  {best ? (
                    <span className={best.passed ? "text-emerald-400 font-bold" : "text-amber-400"}>
                      Best: {best.bestScore}%
                    </span>
                  ) : (
                    <span className="text-zinc-600">Unattempted</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function ResultsScreen({
  sessionResult,
  scenarioKey,
  saveStatus,
  saveError,
  onReset,
  onStartScenario,
}: {
  sessionResult: SessionResult
  scenarioKey: string
  saveStatus: "idle" | "saving" | "saved" | "failed"
  saveError: string | null
  onReset: () => void
  onStartScenario: (key: string) => void
}) {
  const isPassed =
    sessionResult.band === "EXCELLENT" ||
    sessionResult.band === "PASS" ||
    sessionResult.band === "BORDERLINE"

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center pb-4 border-b border-zinc-800">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase mb-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Session Completed
          </div>
          <h2 className="text-2xl font-black text-white">
            {isPassed ? "QUALIFYING PERFORMANCE" : "REMEDIAL PRACTICE NEEDED"}
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Band: <strong className="text-white">{sessionResult.band}</strong> · Scenario: {scenarioKey}
          </p>
        </div>

        {/* 3 Metric Tiles */}
        <div className="grid grid-cols-3 gap-3 font-mono text-center">
          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-[10px] text-zinc-500 uppercase">Accuracy</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {sessionResult.accuracyScore}%
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-[10px] text-zinc-500 uppercase">Speed</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {sessionResult.speedScore}%
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl">
            <div className="text-[10px] text-zinc-500 uppercase">Exceptions</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {sessionResult.exceptionsResolved} / {sessionResult.errorsEncountered.length}
            </div>
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="space-y-3 text-xs">
          {sessionResult.strengths.length > 0 && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
              <span className="font-bold text-emerald-400 font-mono uppercase block mb-1">
                ✓ What Went Well:
              </span>
              <ul className="list-disc list-inside text-zinc-300 space-y-1">
                {sessionResult.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {sessionResult.improvements.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3">
              <span className="font-bold text-rose-400 font-mono uppercase block mb-1">
                ✗ Focus Areas for Next Wave:
              </span>
              <ul className="list-disc list-inside text-zinc-300 space-y-1">
                {sessionResult.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* CTA Buttons (52px+ Glove compliant) */}
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => onStartScenario(scenarioKey)}
            className="glove-target-primary w-full bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all cursor-pointer flex items-center justify-center"
          >
            Run Scenario Again &rarr;
          </button>

          <button
            onClick={onReset}
            className="glove-target-primary w-full bg-zinc-800 hover:bg-zinc-700 text-white font-mono font-bold uppercase tracking-wider text-xs rounded-xl border border-zinc-700 transition-all cursor-pointer flex items-center justify-center"
          >
            Return to Scenario Catalog
          </button>
        </div>
      </div>
    </div>
  )
}
