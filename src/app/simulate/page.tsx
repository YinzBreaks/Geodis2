/**
 * /simulate — Three-panel simulation page
 *
 * Layout (desktop ≥ 1024px):
 *   [Warehouse Floor 30%] [RF Device 40%] [Scanner Panel 30%]
 *
 * Layout (tablet 768–1023px):
 *   [RF Device full-width]
 *   [Warehouse Floor 50%] [Scanner Panel 50%]
 *
 * Layout (mobile < 768px):
 *   [RF Device full-width]
 *   Bottom drawer: Warehouse Floor toggle
 *
 * Flow: scenario selection → active simulation → score display
 *
 * Per CLAUDE.md §Content Rules §Simulations
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 */
"use client"

import { useCallback, useEffect, useState } from "react"
import { RFDeviceEmulator } from "@/components/rf-device/RFDeviceEmulator"
import { WarehouseFloor } from "@/components/warehouse/WarehouseFloor"
import { ScannerPanel } from "@/components/warehouse/ScannerPanel"
import {
  useSimulation,
  selectIsComplete,
  selectScreen,
  getInputMode,
} from "@/hooks/useSimulation"
import { SCENARIO_DATA, type ScenarioBundle } from "@/data/seedData"
import { DifficultyLevel, type SessionScore } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CATALOG — matches SCENARIO_DATA keys in seedData.ts
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIO_OPTIONS: { key: string; levelLabel: string }[] = [
  { key: "Z1_10_PICKS", levelLabel: "BEGINNER" },
  { key: "Z1_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "Z2_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "HAZ_10_PICKS", levelLabel: "ADVANCED" },
  { key: "FEX_15_PICKS", levelLabel: "INTERMEDIATE" },
]

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  // Atomic selectors — subscribe only to the slices this page renders.
  const session = useSimulation((s) => s.session)
  const scenario = useSimulation((s) => s.scenario)
  const score = useSimulation((s) => s.score)
  const result = useSimulation((s) => s.result)
  const startSimulation = useSimulation((s) => s.startSimulation)
  const processInput = useSimulation((s) => s.processInput)
  const reset = useSimulation((s) => s.reset)
  const isComplete = session ? selectIsComplete(session) : false
  const [drawerOpen, setDrawerOpen] = useState(false)

  const difficulty = scenario?.difficulty ?? DifficultyLevel.BEGINNER

  // Reset the global simulation store when this page unmounts, so navigating
  // away (e.g. to /sim) and back doesn't resume a stale session in the
  // module-level Zustand singleton store.
  useEffect(() => () => reset(), [reset])

  // ── Action handlers (delegate to store) ───────────────────────────

  const handleScan = useCallback(
    (barcode: string) => processInput({ type: "SCAN", value: barcode, source: "click" }),
    [processInput]
  )

  const handleType = useCallback(
    (text: string) => processInput({ type: "QUANTITY", value: text, source: "keyboard" }),
    [processInput]
  )

  const handleConfirm = useCallback(() => {
    if (!session) return
    processInput({ type: "CONFIRM", value: "", source: "click" })
  }, [session, processInput])

  // ── Score screen ──────────────────────────────────────────────────

  if (isComplete && score) {
    return <ScoreScreen score={score} onReset={reset} />
  }

  // ── Active simulation — three-panel layout ────────────────────────

  if (session) {
    const lastSuccess = result ? result.success : null
    const lastFeedback = result?.feedback ?? (result?.success ? "OK" : null)

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-600 font-bold text-sm font-mono tracking-wider">
              WarehousePro
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 text-xs font-mono">
              {scenario?.title ?? "Simulation"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-xs font-mono">
              Pick {Math.min(session.currentPickIndex + 1, session.pickQueue.length)}/{session.pickQueue.length}
            </span>
            <span className="text-slate-400 text-xs font-mono">
              Errors: {session.errors.length}
            </span>
            <span className="text-slate-400 text-xs font-mono">
              Zone {session.cart.zone}
            </span>
            <button
              onClick={reset}
              className="text-slate-400 hover:text-red-500 text-xs font-mono underline transition-colors"
            >
              Exit
            </button>
          </div>
        </header>

        {/* Three-panel layout */}
        <main className="flex-1 p-3 flex flex-col lg:flex-row gap-3 overflow-hidden">
          {/* Panel 1: Warehouse Floor (left on desktop, toggle on mobile) */}
          <div className="hidden lg:flex lg:w-[30%] lg:min-w-[280px]">
            <div className="w-full">
              <WarehouseFloor
                session={session}
                difficulty={difficulty}
                onScan={handleScan}
                onConfirm={handleConfirm}
              />
            </div>
          </div>

          {/* Panel 2: RF Device (center) */}
          <div className="flex-1 flex items-start justify-center lg:w-[40%] min-w-0">
            <RFDeviceEmulator />
          </div>

          {/* Panel 3: Scanner Panel (right on desktop, toggle on mobile) */}
          <div className="hidden lg:flex lg:w-[30%] lg:min-w-[260px]">
            <div className="w-full">
              <ScannerPanel
                session={session}
                onScan={handleScan}
                onType={handleType}
                onConfirm={handleConfirm}
                lastSuccess={lastSuccess}
                lastFeedback={lastFeedback}
              />
            </div>
          </div>
        </main>

        {/* Mobile/tablet bottom panels */}
        <div className="lg:hidden">
          {/* Tablet: side-by-side panels */}
          <div className="hidden md:flex gap-3 px-3 pb-3">
            <div className="w-1/2">
              <WarehouseFloor
                session={session}
                difficulty={difficulty}
                onScan={handleScan}
                onConfirm={handleConfirm}
              />
            </div>
            <div className="w-1/2">
              <ScannerPanel
                session={session}
                onScan={handleScan}
                onType={handleType}
                onConfirm={handleConfirm}
                lastSuccess={lastSuccess}
                lastFeedback={lastFeedback}
              />
            </div>
          </div>

          {/* Mobile: bottom drawer toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="
                w-full bg-white border-t border-slate-200
                text-slate-500 text-xs font-mono py-2 text-center
                hover:bg-slate-50 transition-colors
              "
            >
              {drawerOpen ? "▼ Hide Floor & Scanner" : "▲ Show Floor & Scanner"}
            </button>
            {drawerOpen && (
              <div className="bg-slate-50 border-t border-slate-200 p-3 flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
                <WarehouseFloor
                  session={session}
                  difficulty={difficulty}
                  onScan={handleScan}
                  onConfirm={handleConfirm}
                />
                <ScannerPanel
                  session={session}
                  onScan={handleScan}
                  onType={handleType}
                  onConfirm={handleConfirm}
                  lastSuccess={lastSuccess}
                  lastFeedback={lastFeedback}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Scenario selection ────────────────────────────────────────────

  return <ScenarioSelector onStart={startSimulation} />
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function ScenarioSelector({ onStart }: { onStart: (key: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-blue-600 font-bold text-2xl tracking-wider">
          WarehousePro Simulator
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-mono">
          Select a scenario to begin the three-panel simulation
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {SCENARIO_OPTIONS.map(({ key, levelLabel }) => {
          const bundle = SCENARIO_DATA[key] as ScenarioBundle
          const { scenario } = bundle

          const levelColors: Record<string, string> = {
            BEGINNER: "text-green-600 bg-green-50",
            INTERMEDIATE: "text-amber-600 bg-amber-50",
            ADVANCED: "text-red-600 bg-red-50",
          }

          return (
            <button
              key={key}
              onClick={() => onStart(key)}
              className="
                bg-white hover:bg-slate-50 active:bg-slate-100
                border border-slate-200 hover:border-blue-300
                rounded-xl p-4 text-left transition-all shadow-sm hover:shadow
              "
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-slate-800 font-semibold text-sm leading-tight">
                  {scenario.title}
                </span>
                <span
                  className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                    levelColors[levelLabel] ?? "text-slate-500 bg-slate-50"
                  }`}
                >
                  {levelLabel}
                </span>
              </div>
              <p className="text-slate-500 text-xs mb-2">
                {scenario.description}
              </p>
              <div className="flex gap-4 text-slate-400 text-[10px] font-mono">
                <span>{scenario.pickCount} picks</span>
                <span>~{scenario.estimatedMinutes} min</span>
                <span>Zone {scenario.zone}</span>
                <span>Pass ≥ {scenario.passCriteria.minScore}</span>
              </div>
            </button>
          )
        })}
      </div>

      <a
        href="/sim"
        className="text-slate-400 hover:text-blue-500 text-xs font-mono underline transition-colors"
      >
        Use classic single-panel view →
      </a>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function ScoreScreen({
  score,
  onReset,
}: {
  score: SessionScore
  onReset: () => void
}) {
  const passed = score.passed

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-8 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-sm shadow-lg">
        <div className="text-center mb-6">
          <div
            className={`text-3xl font-bold mb-2 ${
              passed ? "text-green-600" : "text-red-500"
            }`}
          >
            {passed ? "PASS" : "FAIL"}
          </div>
          <h2 className="text-slate-700 text-base font-semibold tracking-wider">
            Round Complete
          </h2>
          <p
            className={`text-sm mt-1 ${
              passed ? "text-green-600" : "text-red-500"
            }`}
          >
            Score: {score.finalScore.toFixed(1)} / 100
            {passed ? " — passed" : " — below threshold"}
          </p>
        </div>

        <div className="space-y-2">
          <ScoreLine
            label="Final Score"
            value={`${score.finalScore.toFixed(1)} / 100`}
            highlight
          />
          <ScoreLine label="Accuracy" value={score.accuracyScore.toFixed(1)} />
          <ScoreLine label="Speed" value={score.speedScore.toFixed(1)} />
          <ScoreLine label="Total Picks" value={String(score.totalPicks)} />
          <ScoreLine label="Errors" value={String(score.errorCount)} />
          <ScoreLine
            label="Corrected"
            value={`${score.correctedErrorCount} / ${score.errorCount}`}
          />
          <ScoreLine
            label="Avg Response"
            value={`${score.averageResponseTimeMs}ms`}
          />
          <ScoreLine
            label="Passing Threshold"
            value={String(score.passingThreshold)}
          />
        </div>
      </div>

      <button
        onClick={onReset}
        className="
          bg-blue-600 hover:bg-blue-500 active:bg-blue-700
          text-white font-medium px-8 py-3 rounded-xl
          border border-blue-500 transition-colors shadow-sm
        "
      >
        ← Try Another Scenario
      </button>
    </div>
  )
}

function ScoreLine({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex justify-between items-center py-1 border-b border-slate-100 ${
        highlight ? "text-blue-700 font-bold" : "text-slate-500"
      }`}
    >
      <span className="text-xs">{label}</span>
      <span
        className={`text-sm ${
          highlight ? "text-blue-700" : "text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  )
}
