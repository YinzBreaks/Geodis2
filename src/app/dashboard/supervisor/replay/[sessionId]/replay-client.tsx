/**
 * replay-client.tsx — Client component for session replay playback
 *
 * Layout: Left panel = read-only RF Device screen reconstruction,
 *         Right panel = ReplayTimeline with playback controls.
 *
 * Per CLAUDE.md §Architecture: Components render and delegate — no business logic.
 */
"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ReplayTimeline, type ReplayEvent } from "@/components/dashboard/ReplayTimeline"
import { getDeviceModel, ACTIVE_DEVICE_MODEL_ID } from "@/types/devices"
import type { ReplayScreenSnapshot } from "./page"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ReplayPageClientProps {
  sessionId: string
  moduleId: string
  difficulty: string
  status: string
  finalScore: number | null
  accuracyScore: number | null
  passed: boolean | null
  traineeName: string
  traineeEmployeeId: string
  startedAt: string
  completedAt: string | null
  events: ReplayEvent[]
  screens: (ReplayScreenSnapshot | null)[]
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Build a fallback screen from the replay event when no snapshot is stored. */
function buildFallbackScreen(event: ReplayEvent): ReplayScreenSnapshot {
  return {
    lines: [
      { label: "Step:", value: formatStepLabel(event.step) },
      { label: "Expected:", value: event.expectedValue || "—" },
      { label: "Scanned:", value: event.scannedValue || "—" },
      {},
      {
        label: "Result:",
        value: event.result,
        isHighlighted: event.result !== "SUCCESS",
      },
    ],
    activeField: undefined,
    inputType: "TEXT",
  }
}

/** Human-readable step label. */
function formatStepLabel(step: string): string {
  return step
    .replace(/^BC_|^PK_|^PS_|^EX_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY RF DEVICE RENDERER
// ─────────────────────────────────────────────────────────────────────────────

/** Renders a read-only RF Device screen showing the snapshot at the selected event. */
function ReadOnlyRFDevice({
  screen,
  event,
}: {
  screen: ReplayScreenSnapshot
  event: ReplayEvent
}) {
  const device = getDeviceModel(ACTIVE_DEVICE_MODEL_ID)
  const width = device.emulatorWidthPx ?? 320
  const deviceName = device.displayName

  const isError = event.result !== "SUCCESS"

  return (
    <div
      className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-xl"
      style={{ width: `${width}px` }}
    >
      {/* Device header */}
      <div className="bg-zinc-800 px-3 py-2 flex items-center justify-between">
        <span className="text-zinc-500 font-mono text-[10px]">
          {deviceName} — REPLAY
        </span>
        <span className="text-zinc-600 font-mono text-[10px]">READ ONLY</span>
      </div>

      {/* Screen area */}
      <div
        className="bg-white px-4 py-3 min-h-[280px] flex flex-col gap-1"
        style={{
          fontFamily: device.screen?.fontFamily ?? "'Roboto Mono', monospace",
          fontSize: device.screen?.fontSize ?? "14px",
        }}
      >
        {screen.lines.map((line, i) => (
          <div key={i} className="flex items-baseline gap-2">
            {line.label && (
              <span className="text-zinc-500 text-xs">{line.label}</span>
            )}
            {line.value && (
              <span
                className={`text-sm font-medium ${
                  line.isHighlighted ? "text-red-600 font-bold" : "text-zinc-900"
                }`}
              >
                {line.value}
              </span>
            )}
            {!line.label && !line.value && <div className="h-4" />}
          </div>
        ))}
      </div>

      {/* Result bar */}
      <div
        className={`px-4 py-2 font-mono text-xs text-center font-bold ${
          isError
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"
        }`}
      >
        {event.result} {isError ? "✗" : "✓"}
      </div>

      {/* Response time */}
      <div className="bg-zinc-800 px-4 py-2 flex items-center justify-between">
        <span className="text-zinc-500 font-mono text-[10px]">
          Response: {(event.responseTimeMs / 1000).toFixed(1)}s
        </span>
        {event.injected && (
          <span className="text-yellow-500 font-mono text-[10px]">
            ⚡ Injected Scenario
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Client-side session replay page with RF Device + Timeline. */
export function ReplayPageClient({
  sessionId,
  moduleId,
  difficulty,
  status,
  finalScore,
  accuracyScore,
  passed,
  traineeName,
  traineeEmployeeId,
  startedAt,
  completedAt,
  events,
  screens,
}: ReplayPageClientProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const currentEvent = events[selectedIndex]
  const currentScreen = useMemo(() => {
    if (!currentEvent) return null
    return screens[selectedIndex] ?? buildFallbackScreen(currentEvent)
  }, [selectedIndex, currentEvent, screens])

  const errorCount = useMemo(
    () => events.filter((e) => e.result !== "SUCCESS").length,
    [events]
  )

  if (events.length === 0) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 font-mono text-sm">
            No replay events for this session.
          </p>
          <Link
            href="/dashboard/supervisor"
            className="text-blue-400 hover:text-blue-300 font-mono text-xs mt-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/dashboard/supervisor"
              className="text-zinc-500 hover:text-zinc-300 font-mono text-xs"
            >
              ← Dashboard
            </Link>
            <h1 className="text-zinc-100 font-mono text-lg font-bold mt-1">
              Session Replay — {traineeName}
            </h1>
            <p className="text-zinc-500 font-mono text-xs">
              ID: {traineeEmployeeId} · {moduleId} · {difficulty} ·{" "}
              {new Date(startedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div className="text-center">
              <p className="text-zinc-500">Score</p>
              <p className="text-zinc-200 text-lg font-bold">
                {finalScore !== null ? Math.round(finalScore) : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500">Accuracy</p>
              <p className="text-zinc-200 text-lg font-bold">
                {accuracyScore !== null ? Math.round(accuracyScore) : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500">Errors</p>
              <p
                className={`text-lg font-bold ${errorCount > 0 ? "text-red-400" : "text-green-400"}`}
              >
                {errorCount}
              </p>
            </div>
            <div className="text-center">
              <p className="text-zinc-500">Passed</p>
              <p className="text-lg">
                {passed === true ? (
                  <span className="text-green-400">✓</span>
                ) : passed === false ? (
                  <span className="text-red-400">✗</span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content: RF Device + Timeline */}
      <div className="flex-1 flex min-h-0">
        {/* Left: RF Device Screen */}
        <div className="w-[380px] flex-shrink-0 border-r border-zinc-800 flex items-start justify-center pt-8 px-4">
          {currentEvent && currentScreen && (
            <ReadOnlyRFDevice
              screen={currentScreen}
              event={currentEvent}
            />
          )}
        </div>

        {/* Right: Replay Timeline */}
        <div className="flex-1 flex flex-col min-h-0">
          <ReplayTimeline
            events={events}
            selectedIndex={selectedIndex}
            onSelectEvent={setSelectedIndex}
          />
        </div>
      </div>
    </main>
  )
}
