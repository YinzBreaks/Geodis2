/**
 * /sim — RF Device Simulator page
 *
 * Flow: scenario selection → active simulation → score display
 *
 * Per CLAUDE.md §Content Rules §Simulations
 * Redesigned with Industrial Dashboard tokens (amber accent, surface cards).
 */
"use client"

import { useEffect, useState } from "react"
import { RFDevice } from "@/components/simulator/RFDevice"
import { DeviceSelector } from "@/components/simulator/DeviceSelector"
import { CoachingPanel } from "@/components/simulator/CoachingPanel"
import { StepProgressBar } from "@/components/simulator/StepProgressBar"
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
    actionCount,
    estimatedTotalSteps,
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
    // Cap display at estimatedTotalSteps to avoid overshoot from error-injected extra steps.
    const displayStep = Math.min(actionCount, estimatedTotalSteps)
    const displayTotal = estimatedTotalSteps > 0 ? estimatedTotalSteps : 1

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-4"
        style={{ backgroundColor: "var(--color-base)" }}
      >
        {deviceSelector}

        {/* Step progress bar + stats row */}
        <div className="flex flex-col items-center gap-3" style={{ width: "100%", maxWidth: 600 }}>
          <StepProgressBar
            totalSteps={displayTotal}
            currentStep={displayStep}
            label={`Step ${displayStep + 1} of ${displayTotal}`}
          />
          <div
            className="flex gap-4"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-text-secondary)",
            }}
          >
            <span>
              Pick {session.currentPickIndex} / {session.pickQueue.length}
            </span>
            <span>
              Errors: <span style={{ color: session.errors.length > 0 ? "var(--color-danger)" : "inherit" }}>{session.errors.length}</span>
            </span>
            <span>
              Zone: <span style={{ color: "var(--color-amber)" }}>{session.cart.zone}</span>
            </span>
            {isBeginner && (
              <span style={{ color: "var(--color-amber)", fontWeight: 600 }}>BEGINNER</span>
            )}
          </div>
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
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-secondary)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            cursor: "pointer",
            textDecoration: "underline",
            opacity: 0.7,
          }}
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

/** Difficulty label → left border color */
const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: "var(--color-success, #2ea043)",
  INTERMEDIATE: "var(--color-amber, #f0a500)",
  ADVANCED: "var(--color-danger, #f85149)",
}

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
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 p-4"
      style={{ backgroundColor: "var(--color-base)" }}
    >
      <div className="text-center">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            letterSpacing: "0.04em",
          }}
        >
          RF SIMULATOR
        </h1>
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            color: "var(--color-text-secondary)",
            marginTop: 4,
          }}
        >
          Select a scenario to begin
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full" style={{ maxWidth: 440 }}>
        {SCENARIO_OPTIONS.map(({ key, levelLabel }) => {
          const bundle = SCENARIO_DATA[key] as ScenarioBundle
          const { scenario } = bundle
          const best = sessionBests[scenario.moduleId]
          const borderColor = DIFFICULTY_COLOR[levelLabel] ?? "var(--color-border)"

          return (
            <button
              key={key}
              onClick={() => onStart(key)}
              style={{
                backgroundColor: "var(--color-surface-1)",
                border: "1px solid var(--color-border)",
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: "var(--radius-md)",
                padding: "16px 18px",
                textAlign: "left",
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s, background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface-2)"
                e.currentTarget.style.borderLeftColor = "var(--color-amber)"
                e.currentTarget.style.transform = "translateY(-2px)"
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(240, 165, 0, 0.2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-surface-1)"
                e.currentTarget.style.borderLeftColor = borderColor
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--color-text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {scenario.title}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginTop: 2 }}>
                  {best && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: best.passed
                          ? "rgba(46, 160, 67, 0.15)"
                          : "rgba(240, 165, 0, 0.15)",
                        color: best.passed ? "var(--color-success)" : "var(--color-amber)",
                        border: `1px solid ${best.passed ? "rgba(46, 160, 67, 0.3)" : "rgba(240, 165, 0, 0.3)"}`,
                      }}
                    >
                      ✓ Best: {best.bestScore}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: borderColor,
                      fontWeight: 600,
                    }}
                  >
                    {levelLabel}
                  </span>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  color: "var(--color-text-secondary)",
                  marginBottom: 10,
                  lineHeight: 1.5,
                }}
              >
                {scenario.description}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--color-text-secondary)",
                }}
              >
                <span><strong style={{ color: "var(--color-amber)" }}>{scenario.pickCount}</strong> picks</span>
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
  color,
}: {
  label: string
  value: string
  unit: string
  color?: string
}) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "12px 8px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--color-text-secondary)",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 22,
          fontWeight: 700,
          color: color ?? "var(--color-text-primary)",
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--color-text-secondary)",
        }}
      >
        {unit}
      </p>
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
      style={{
        width: "100%",
        backgroundColor: disabled ? "var(--color-surface-2)" : "var(--color-amber)",
        color: disabled ? "var(--color-text-secondary)" : "var(--color-base)",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.04em",
        padding: "12px 24px",
        borderRadius: "var(--radius-md)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.opacity = "0.9" }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1" }}
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
      style={{
        width: "100%",
        backgroundColor: "transparent",
        color: "var(--color-text-secondary)",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        fontSize: 13,
        padding: "10px 24px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-amber)"
        e.currentTarget.style.color = "var(--color-text-primary)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)"
        e.currentTarget.style.color = "var(--color-text-secondary)"
      }}
    >
      {children}
    </button>
  )
}

// ── Verdict section (A) ──────────────────────────────────────────────────────

function VerdictSection({ sessionResult }: { sessionResult: SessionResult }) {
  const { band, finalScore } = sessionResult

  /** Band color mapping */
  const bandConfig: Record<string, { color: string; label: string; bgOpacity: string }> = {
    EXCELLENT: { color: "var(--color-success)", label: "EXCELLENT", bgOpacity: "rgba(46, 160, 67, 0.1)" },
    PASS:      { color: "var(--color-success)", label: "PASSED", bgOpacity: "rgba(46, 160, 67, 0.1)" },
    BORDERLINE:{ color: "var(--color-amber)", label: "PASSED — JUST", bgOpacity: "rgba(240, 165, 0, 0.1)" },
    FAIL:      { color: "var(--color-danger)", label: "NOT YET", bgOpacity: "rgba(248, 81, 73, 0.1)" },
  }

  const config = bandConfig[band] ?? bandConfig.FAIL
  const isPassed = band !== "FAIL"

  return (
    <div
      className="fade-in-up"
      style={{
        textAlign: "center",
        padding: "32px 16px",
        background: config.bgOpacity,
        borderRadius: "var(--radius-md)",
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 48, color: config.color, marginBottom: 8 }}>
        {isPassed ? "✓" : "✗"}
      </div>

      {/* Band label */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.5rem, 5vw, 2rem)",
          fontWeight: 700,
          color: config.color,
          letterSpacing: "0.06em",
        }}
      >
        {config.label}
      </div>

      {/* Score */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "clamp(2rem, 8vw, 4rem)",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          marginTop: 4,
          lineHeight: 1.1,
        }}
      >
        {finalScore}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          marginTop: 2,
        }}
      >
        / 100
      </div>

      {/* Sub-message */}
      {band === "BORDERLINE" && (
        <p style={{ color: "var(--color-amber)", fontFamily: "var(--font-ui)", fontSize: 12, marginTop: 12, maxWidth: 280, margin: "12px auto 0" }}>
          You passed, but your supervisor may recommend additional practice.
        </p>
      )}
      {band === "FAIL" && (
        <p style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-ui)", fontSize: 12, marginTop: 12, maxWidth: 280, margin: "12px auto 0" }}>
          Keep practicing — most trainees need 2–3 attempts before passing.
        </p>
      )}
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
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center", marginTop: 4 }}>
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
  /** Color helper for metric values */
  const scoreColor = (v: number) =>
    v >= 85 ? "var(--color-success)" : v >= 70 ? "var(--color-amber)" : "var(--color-danger)"

  const exCount = sessionResult.errorsEncountered.length
  const exColor =
    exCount === 0 || sessionResult.exceptionsResolved === exCount
      ? "var(--color-success)"
      : sessionResult.exceptionsResolved > 0
        ? "var(--color-amber)"
        : "var(--color-danger)"

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start gap-0 py-8 px-4"
      style={{ backgroundColor: "var(--color-base)" }}
    >
      {/* ── Save error banner ── */}
      {saveError && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "rgba(240, 165, 0, 0.15)",
            borderBottom: "1px solid rgba(240, 165, 0, 0.3)",
            padding: "8px 16px",
            textAlign: "center",
          }}
        >
          <span style={{ color: "var(--color-amber)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{saveError}</span>
        </div>
      )}

      <div
        style={{ width: "100%", maxWidth: 420, marginTop: saveError ? 40 : 0 }}
      >
        {/* ── A. VERDICT ── */}
        <div
          style={{
            backgroundColor: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <VerdictSection sessionResult={sessionResult} />
        </div>

        {/* ── B. SCORE BREAKDOWN ── */}
        <div
          style={{
            backgroundColor: "var(--color-surface-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            marginTop: 12,
          }}
        >
          {/* Three metric tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <MetricTile
              label="ACCURACY"
              value={String(sessionResult.accuracyScore)}
              unit="/ 100"
              color={scoreColor(sessionResult.accuracyScore)}
            />
            <MetricTile
              label="SPEED"
              value={String(sessionResult.speedScore)}
              unit="/ 100"
              color={scoreColor(sessionResult.speedScore)}
            />
            <MetricTile
              label="EXCEPTIONS"
              value={exCount > 0 ? `${sessionResult.exceptionsResolved}/${exCount}` : "—"}
              unit="Resolved"
              color={exColor}
            />
          </div>

          {/* Strengths and improvements */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              paddingTop: 12,
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-success)",
                  marginBottom: 8,
                }}
              >
                ✓ What Went Well
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {sessionResult.strengths.map((s, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--color-danger)",
                  marginBottom: 8,
                }}
              >
                ✗ Room to Improve
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {sessionResult.improvements.map((s, i) => (
                  <li key={i} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    {/* Highlight SOP references (e.g. §5.2.8) in amber */}
                    {s.replace(/(§[\d.]+)/g, "$1").split(/(§[\d.]+)/).map(
                      (part, j) =>
                        /^§/.test(part) ? (
                          <span key={j} style={{ color: "var(--color-amber)", fontWeight: 600 }}>{part}</span>
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
        <div style={{ marginTop: 12 }}>
          <CtaSection
            sessionResult={sessionResult}
            scenarioKey={scenarioKey}
            saveStatus={saveStatus}
            onReset={onReset}
            onStartScenario={onStartScenario}
          />
        </div>

        {/* ── Scenario info line ── */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-text-secondary)",
            textAlign: "center",
            marginTop: 16,
          }}
        >
          {sessionResult.zone} &middot; {sessionResult.totalPicks} picks &middot;{" "}
          {sessionResult.difficulty} &middot; {formatDuration(sessionResult.durationSeconds)}
        </p>
      </div>
    </div>
  )
}
