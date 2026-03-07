/**
 * /sim — RF Device Simulator page
 *
 * Flow: scenario selection → active simulation → score display
 *
 * Per CLAUDE.md §Content Rules §Simulations
 */
"use client"

import { RFDevice } from "@/components/simulator/RFDevice"
import { DeviceSelector } from "@/components/simulator/DeviceSelector"
import { CoachingPanel } from "@/components/simulator/CoachingPanel"
import { useSimulation, selectIsComplete } from "@/hooks/useSimulation"
import { DifficultyLevel } from "@/types/domain"
import { SCENARIO_DATA, type ScenarioBundle } from "@/data/seedData"
import type { SessionScore } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CATALOG — matches SCENARIO_DATA keys in seedData.ts
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIO_OPTIONS: { key: string; levelLabel: string }[] = [
  { key: "Z1_9_PICKS", levelLabel: "BEGINNER" },
  { key: "Z1_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "Z2_20_PICKS", levelLabel: "INTERMEDIATE" },
  { key: "HAZ_10_PICKS", levelLabel: "ADVANCED" },
  { key: "FEX_15_PICKS", levelLabel: "INTERMEDIATE" },
]

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SimPage() {
  const { session, score, coaching, startSimulation, reset } = useSimulation()
  const isComplete = session ? selectIsComplete(session) : false

  // Score screen
  if (isComplete && score) {
    return <ScoreScreen score={score} onReset={reset} />
  }

  // Device selector — fixed top-right on all non-score views
  const deviceSelector = (
    <div className="fixed top-3 right-3 z-50">
      <DeviceSelector />
    </div>
  )

  // Active simulation
  if (session) {
    const isBeginner = session.difficulty === DifficultyLevel.BEGINNER

    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-4">
        {deviceSelector}
        {/* Progress indicator */}
        <div className="text-zinc-500 text-xs font-mono flex gap-4">
          <span>
            Pick {session.currentPickIndex} / {session.pickQueue.length}
          </span>
          <span>
            Errors: {session.errors.length}
          </span>
          <span>
            Zone: {session.cart.zone}
          </span>
          {isBeginner && (
            <span className="text-green-700">BEGINNER MODE</span>
          )}
        </div>

        {/*
          Layout:
            BEGINNER      → [CoachingPanel] [RF Device]
            INTERMEDIATE+ → [RF Device] (coaching panel hidden)

          Both panels are the same height so the RF device stays centered.
          On narrow screens the panels stack vertically.
        */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 20,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {isBeginner && (
            <CoachingPanel
              coaching={coaching}
              difficulty={session.difficulty}
            />
          )}
          <RFDevice />
        </div>

        <button
          onClick={reset}
          className="text-zinc-700 hover:text-zinc-500 text-xs font-mono underline"
        >
          &larr; Back to scenario select
        </button>
      </div>
    )
  }

  // Scenario selection
  return (
    <>
      {deviceSelector}
      <ScenarioSelector onStart={startSimulation} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO SELECTOR
// ─────────────────────────────────────────────────────────────────────────────

function ScenarioSelector({ onStart }: { onStart: (key: string) => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8 p-4">
      <div className="text-center">
        <h1 className="text-green-400 font-mono text-2xl font-bold tracking-wider">
          RF SIMULATOR
        </h1>
        <p className="text-zinc-500 font-mono text-sm mt-1">
          Select a scenario to begin
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        {SCENARIO_OPTIONS.map(({ key, levelLabel }) => {
          const bundle = SCENARIO_DATA[key] as ScenarioBundle
          const { scenario } = bundle
          return (
            <button
              key={key}
              onClick={() => onStart(key)}
              className="
                bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700
                border border-zinc-700 hover:border-green-800
                rounded-xl p-4 text-left transition-all
              "
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-green-400 font-mono font-bold text-sm leading-tight">
                  {scenario.title}
                </span>
                <span className="text-zinc-600 font-mono text-[10px] shrink-0 mt-0.5">
                  {levelLabel}
                </span>
              </div>
              <p className="text-zinc-500 text-xs font-mono mb-2">
                {scenario.description}
              </p>
              <div className="flex gap-4 text-zinc-600 text-[10px] font-mono">
                <span>{scenario.pickCount} picks</span>
                <span>~{scenario.estimatedMinutes} min</span>
                <span>Zone {scenario.zone}</span>
                <span>Pass: {scenario.passCriteria.minScore}</span>
              </div>
            </button>
          )
        })}
      </div>
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-8 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm font-mono">
        <div className="text-center mb-6">
          <div className="text-green-400 text-3xl font-bold mb-2">
            {passed ? "[ PASS ]" : "[ FAIL ]"}
          </div>
          <h2 className="text-zinc-300 text-base tracking-wider">
            ROUND COMPLETE
          </h2>
          <p
            className={`text-sm mt-1 ${passed ? "text-green-600" : "text-red-500"}`}
          >
            {passed
              ? `Score: ${score.finalScore.toFixed(1)} — passed`
              : `Score: ${score.finalScore.toFixed(1)} — below threshold`}
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
          bg-green-800 hover:bg-green-700 active:bg-green-600
          text-green-100 font-mono px-8 py-3 rounded-xl
          border border-green-700 transition-colors
        "
      >
        &larr; Try Another Scenario
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
      className={`flex justify-between items-center py-1 border-b border-zinc-800 ${
        highlight ? "text-green-300 font-bold" : "text-zinc-400"
      }`}
    >
      <span className="text-xs">{label}</span>
      <span className={`text-sm ${highlight ? "text-green-300" : "text-zinc-300"}`}>
        {value}
      </span>
    </div>
  )
}
