/**
 * /sim — RF Device Simulator page
 *
 * Flow: scenario selection → active simulation → score display
 *
 * Per CLAUDE.md §Content Rules §Simulations
 */
"use client"

import { useEffect, useState } from "react"
import { RFDevice } from "@/components/simulator/RFDevice"
import { DeviceSelector } from "@/components/simulator/DeviceSelector"
import { CoachingPanel } from "@/components/simulator/CoachingPanel"
import { useSimulation } from "@/hooks/useSimulation"
import { DifficultyLevel } from "@/types/domain"
import { SCENARIO_DATA, type ScenarioBundle } from "@/data/seedData"
import type { SessionResult } from "@/types/domain"

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
  } = useSimulation()

  // Trigger DB persistence as soon as the result is ready (fire-and-forget)
  useEffect(() => {
    if (sessionResult && saveStatus === "idle") {
      void persistSession()
    }
  }, [sessionResult, saveStatus, persistSession])

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

/** Best session result per moduleId, fetched from /api/sessions. */
type SessionBest = { bestScore: number; passed: boolean }

function ScenarioSelector({ onStart }: { onStart: (key: string) => void }) {
  const [sessionBests, setSessionBests] = useState<Record<string, SessionBest>>(
    {}
  )

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, SessionBest>) => setSessionBests(data))
      .catch(() => {
        // Not authenticated or network error — silently skip badges
      })
  }, [])

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
          const best = sessionBests[scenario.moduleId]
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
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {best && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                        best.passed
                          ? "text-green-400 border-green-800 bg-green-950"
                          : "text-amber-400 border-amber-800 bg-amber-950"
                      }`}
                    >
                      ✓ Best: {best.bestScore}
                    </span>
                  )}
                  <span className="text-zinc-600 font-mono text-[10px]">
                    {levelLabel}
                  </span>
                </div>
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
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

/** Scenario to suggest after a PASS at the current level. */
const NEXT_SCENARIO_MAP: Record<string, string | undefined> = {
  Z1_9_PICKS: "Z1_20_PICKS",
  Z1_20_PICKS: "HAZ_10_PICKS",
  Z2_20_PICKS: "HAZ_10_PICKS",
  FEX_15_PICKS: "HAZ_10_PICKS",
  HAZ_10_PICKS: undefined,
}

/** Scenario to suggest stepping down to after a FAIL. */
const LOWER_SCENARIO_MAP: Record<string, string | undefined> = {
  Z1_9_PICKS: undefined,
  Z1_20_PICKS: "Z1_9_PICKS",
  Z2_20_PICKS: "Z1_9_PICKS",
  FEX_15_PICKS: "Z1_9_PICKS",
  HAZ_10_PICKS: "Z1_20_PICKS",
}

/** User-facing label for a scenario key. */
const SCENARIO_LABEL: Record<string, string> = {
  Z1_9_PICKS: "Beginner",
  Z1_20_PICKS: "Intermediate",
  Z2_20_PICKS: "Intermediate",
  FEX_15_PICKS: "Intermediate",
  HAZ_10_PICKS: "Advanced",
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—"
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, "0")
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// ── Small reusable pieces ────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  unit,
  color = "text-zinc-300",
}: {
  label: string
  value: string
  unit: string
  color?: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
      <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
      <p className="text-zinc-600 font-mono text-[10px]">{unit}</p>
    </div>
  )
}

function PrimaryBtn({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        w-full bg-green-800 hover:bg-green-700 active:bg-green-600
        disabled:bg-zinc-800 disabled:text-zinc-600
        text-green-100 font-mono text-sm px-6 py-3 rounded-lg
        border border-green-700 transition-colors
      "
    >
      {children}
    </button>
  )
}

function SecondaryBtn({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="
        w-full text-zinc-400 hover:text-zinc-200 font-mono text-sm px-6 py-2
        border border-zinc-800 hover:border-zinc-600 rounded-lg
        transition-colors
      "
    >
      {children}
    </button>
  )
}

// ── Verdict section (A) ──────────────────────────────────────────────────────

function VerdictSection({ sessionResult }: { sessionResult: SessionResult }) {
  const { band, finalScore } = sessionResult

  if (band === "EXCELLENT") {
    return (
      <div className="text-center py-8">
        <div className="text-green-400 text-6xl mb-3">✓</div>
        <div className="text-green-400 font-mono text-3xl font-bold tracking-widest">
          EXCELLENT
        </div>
        <div className="text-zinc-300 font-mono text-2xl mt-2">
          {finalScore} / 100
        </div>
      </div>
    )
  }

  if (band === "PASS") {
    return (
      <div className="text-center py-8">
        <div className="text-green-400 text-5xl mb-3">✓</div>
        <div className="text-green-400 font-mono text-3xl font-bold tracking-widest">
          PASSED
        </div>
        <div className="text-zinc-300 font-mono text-2xl mt-2">
          {finalScore} / 100
        </div>
      </div>
    )
  }

  if (band === "BORDERLINE") {
    return (
      <div className="text-center py-8">
        <div className="text-amber-400 text-5xl mb-3">⚠</div>
        <div className="text-amber-400 font-mono text-2xl font-bold tracking-widest">
          PASSED — JUST
        </div>
        <div className="text-zinc-300 font-mono text-2xl mt-2">
          {finalScore} / 100
        </div>
        <p className="text-amber-700 font-mono text-xs mt-3 max-w-xs mx-auto">
          You passed, but your supervisor may recommend additional practice.
        </p>
      </div>
    )
  }

  // FAIL
  return (
    <div className="text-center py-8">
      <div className="text-red-500 text-5xl mb-3">✗</div>
      <div className="text-red-500 font-mono text-2xl font-bold tracking-widest">
        NOT YET
      </div>
      <div className="text-zinc-300 font-mono text-2xl mt-2">{finalScore} / 100</div>
      <p className="text-zinc-500 font-mono text-xs mt-3 max-w-xs mx-auto">
        Keep practicing — most trainees need 2&ndash;3 attempts before passing.
      </p>
    </div>
  )
}

// ── CTA section (C) ─────────────────────────────────────────────────────────

function CtaSection({
  sessionResult,
  scenarioKey,
  saveStatus,
  onReset,
  onStartScenario,
}: {
  sessionResult: SessionResult
  scenarioKey: string
  saveStatus: "idle" | "saving" | "saved" | "failed"
  onReset: () => void
  onStartScenario: (key: string) => void
}) {
  const { band, difficulty } = sessionResult
  const nextKey = NEXT_SCENARIO_MAP[scenarioKey]
  const lowerKey = LOWER_SCENARIO_MAP[scenarioKey]
  const isPassed = band === "EXCELLENT" || band === "PASS" || band === "BORDERLINE"

  if (!isPassed && difficulty === DifficultyLevel.BEGINNER) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <PrimaryBtn onClick={() => onStartScenario(scenarioKey)}>Try Again — Beginner</PrimaryBtn>
        <SecondaryBtn onClick={onReset}>Back to scenarios</SecondaryBtn>
      </div>
    )
  }

  if (!isPassed) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <PrimaryBtn onClick={() => onStartScenario(scenarioKey)}>Try Again</PrimaryBtn>
        {lowerKey && (
          <SecondaryBtn onClick={() => onStartScenario(lowerKey)}>
            Step down to {SCENARIO_LABEL[lowerKey] ?? lowerKey}
          </SecondaryBtn>
        )}
        <SecondaryBtn onClick={onReset}>Back to scenarios</SecondaryBtn>
      </div>
    )
  }

  if (difficulty === DifficultyLevel.BEGINNER && nextKey) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <PrimaryBtn onClick={() => onStartScenario(nextKey)}>
          🎉 Try Intermediate
        </PrimaryBtn>
        <SecondaryBtn onClick={() => onStartScenario(scenarioKey)}>
          Try Again — Beginner
        </SecondaryBtn>
      </div>
    )
  }

  if (difficulty === DifficultyLevel.INTERMEDIATE && nextKey) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <PrimaryBtn onClick={() => onStartScenario(nextKey)}>Try Advanced</PrimaryBtn>
        <SecondaryBtn onClick={() => onStartScenario(scenarioKey)}>
          Try Again — Intermediate
        </SecondaryBtn>
      </div>
    )
  }

  // PASS/EXCELLENT on ADVANCED (or no next scenario)
  return (
    <div className="flex flex-col gap-2 w-full">
      <PrimaryBtn onClick={onReset}>Back to scenarios</PrimaryBtn>
      {(saveStatus === "saved" || saveStatus === "saving") && (
        <p className="text-zinc-600 font-mono text-xs text-center">
          {saveStatus === "saving"
            ? "Saving result..."
            : "Your supervisor has been notified of your score."}
        </p>
      )}
    </div>
  )
}

// ── Full results screen ──────────────────────────────────────────────────────

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
  const accuracyColor =
    sessionResult.accuracyScore >= 85
      ? "text-green-400"
      : sessionResult.accuracyScore >= 70
        ? "text-amber-400"
        : "text-red-500"

  const speedColor =
    sessionResult.speedScore >= 85
      ? "text-green-400"
      : sessionResult.speedScore >= 70
        ? "text-amber-400"
        : "text-red-500"

  const exCount = sessionResult.errorsEncountered.length
  const exColor =
    exCount === 0 || sessionResult.exceptionsResolved === exCount
      ? "text-green-400"
      : sessionResult.exceptionsResolved > 0
        ? "text-amber-400"
        : "text-red-500"

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-start gap-0 py-8 px-4">
      {/* ── Save error banner ── */}
      {saveError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-950 border-b border-amber-800 px-4 py-2 text-center">
          <span className="text-amber-400 font-mono text-xs">{saveError}</span>
        </div>
      )}

      <div
        className="w-full max-w-sm"
        style={{ marginTop: saveError ? 40 : 0 }}
      >
        {/* ── A. VERDICT ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-6">
          <VerdictSection sessionResult={sessionResult} />
        </div>

        {/* ── B. SCORE BREAKDOWN ── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-3">
          {/* Three metric tiles */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <MetricTile
              label="ACCURACY"
              value={String(sessionResult.accuracyScore)}
              unit="/ 100"
              color={accuracyColor}
            />
            <MetricTile
              label="SPEED"
              value={String(sessionResult.speedScore)}
              unit="/ 100"
              color={speedColor}
            />
            <MetricTile
              label="EXCEPTIONS"
              value={exCount > 0 ? `${sessionResult.exceptionsResolved}/${exCount}` : "—"}
              unit="Resolved"
              color={exColor}
            />
          </div>

          {/* Strengths and improvements */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-800">
            <div>
              <p className="text-green-700 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                ✓ What Went Well
              </p>
              <ul className="space-y-1.5">
                {sessionResult.strengths.map((s, i) => (
                  <li key={i} className="text-zinc-400 font-mono text-xs leading-snug">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-red-700 font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                ✗ Room to Improve
              </p>
              <ul className="space-y-1.5">
                {sessionResult.improvements.map((s, i) => (
                  <li key={i} className="text-zinc-400 font-mono text-xs leading-snug">
                    {/* Highlight SOP references (e.g. §5.2.8) in amber */}
                    {s.replace(/(§[\d.]+)/g, "$1").split(/(§[\d.]+)/).map(
                      (part, j) =>
                        /^§/.test(part) ? (
                          <span key={j} className="text-amber-500">{part}</span>
                        ) : (
                          part
                        )
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── C. NEXT ACTION ── */}
        <div className="mt-3">
          <CtaSection
            sessionResult={sessionResult}
            scenarioKey={scenarioKey}
            saveStatus={saveStatus}
            onReset={onReset}
            onStartScenario={onStartScenario}
          />
        </div>

        {/* ── Scenario info line ── */}
        <p className="text-zinc-700 font-mono text-[10px] text-center mt-4">
          {sessionResult.zone} &middot; {sessionResult.totalPicks} picks &middot;{" "}
          {sessionResult.difficulty} &middot; {formatDuration(sessionResult.durationSeconds)}
        </p>
      </div>
    </div>
  )
}
