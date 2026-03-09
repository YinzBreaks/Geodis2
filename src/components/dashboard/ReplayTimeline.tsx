/**
 * ReplayTimeline.tsx — Session replay timeline with playback controls
 *
 * Scrollable event list where each row shows:
 *   Timestamp | Step | Scanned | Expected | Result (✓/✗) | Response time
 *
 * Click any event to seek. Error events highlighted red.
 * Injected error scenarios labeled with "⚡ Injected scenario".
 *
 * Playback controls: ← Previous  → Next  ▶ Auto-play (1.5s)  ⏸ Pause
 * Jump to first/last error.
 *
 * Per CLAUDE.md §Architecture: components render only — no business logic.
 */
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { formatStepLabel } from "@/lib/stepLabels"

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** A single replay event (parsed from replayEvents JSON). */
export interface ReplayEvent {
  /** Event index in the sequence */
  index: number
  /** Timestamp of the scan */
  timestamp: string
  /** WorkflowStep at this event */
  step: string
  /** What the user scanned */
  scannedValue: string
  /** What was expected */
  expectedValue: string
  /** Scan result (SUCCESS, WRONG_ITEM, etc.) */
  result: string
  /** Time to scan in ms */
  responseTimeMs: number
  /** Whether this was an injected error scenario */
  injected?: boolean
  /** SOP reference for this step */
  sopReference?: string
}

/** Props for the ReplayTimeline component. */
export interface ReplayTimelineProps {
  /** All replay events in chronological order */
  events: ReplayEvent[]
  /** Currently selected event index */
  selectedIndex: number
  /** Callback when an event is selected */
  onSelectEvent: (index: number) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable step label — delegates to the shared stepLabels map. */
function formatStep(step: string): string {
  return formatStepLabel(step)
}

function isErrorResult(result: string): boolean {
  return result !== "SUCCESS"
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/** Session replay timeline with playback controls and event seeking. */
export function ReplayTimeline({
  events,
  selectedIndex,
  onSelectEvent,
}: ReplayTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to selected event
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-event-index="${selectedIndex}"]`
    )
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [selectedIndex])

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onSelectEvent(
          selectedIndex < events.length - 1 ? selectedIndex + 1 : selectedIndex
        )
      }, 1500)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, selectedIndex, events.length, onSelectEvent])

  // Pause at end
  useEffect(() => {
    if (isPlaying && selectedIndex >= events.length - 1) {
      setIsPlaying(false)
    }
  }, [isPlaying, selectedIndex, events.length])

  const goToPrev = useCallback(() => {
    if (selectedIndex > 0) onSelectEvent(selectedIndex - 1)
  }, [selectedIndex, onSelectEvent])

  const goToNext = useCallback(() => {
    if (selectedIndex < events.length - 1) onSelectEvent(selectedIndex + 1)
  }, [selectedIndex, events.length, onSelectEvent])

  const jumpToFirstError = useCallback(() => {
    const idx = events.findIndex((e) => isErrorResult(e.result))
    if (idx >= 0) onSelectEvent(idx)
  }, [events, onSelectEvent])

  const jumpToLastError = useCallback(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (isErrorResult(events[i].result)) {
        onSelectEvent(i)
        return
      }
    }
  }, [events, onSelectEvent])

  const selectedEvent = events[selectedIndex]

  return (
    <div className="flex flex-col h-full">
      {/* Playback Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/80">
        <button
          onClick={goToPrev}
          disabled={selectedIndex <= 0}
          className="px-2 py-1 text-zinc-400 hover:text-zinc-200 font-mono text-xs disabled:opacity-30"
          title="Previous event"
        >
          ← Prev
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs rounded"
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          onClick={goToNext}
          disabled={selectedIndex >= events.length - 1}
          className="px-2 py-1 text-zinc-400 hover:text-zinc-200 font-mono text-xs disabled:opacity-30"
          title="Next event"
        >
          Next →
        </button>
        <div className="flex-1" />
        <button
          onClick={jumpToFirstError}
          className="px-2 py-1 text-red-400 hover:text-red-300 font-mono text-xs"
          title="Jump to first error"
        >
          ⇤ First Error
        </button>
        <button
          onClick={jumpToLastError}
          className="px-2 py-1 text-red-400 hover:text-red-300 font-mono text-xs"
          title="Jump to last error"
        >
          Last Error ⇥
        </button>
        <span className="text-zinc-600 font-mono text-xs">
          {selectedIndex + 1} / {events.length}
        </span>
      </div>

      {/* Event List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {events.map((event) => {
          const isError = isErrorResult(event.result)
          const isSelected = event.index === selectedIndex

          return (
            <div
              key={event.index}
              data-event-index={event.index}
              onClick={() => onSelectEvent(event.index)}
              className={`
                flex items-center gap-2 px-3 py-2 font-mono text-xs
                cursor-pointer border-l-2 transition-colors
                ${isSelected ? "bg-zinc-800 border-l-green-400" : "border-l-transparent hover:bg-zinc-800/50"}
                ${isError ? "bg-red-950/20" : ""}
              `}
            >
              {/* Result indicator */}
              <span className={isError ? "text-red-400" : "text-green-400"}>
                {isError ? "✗" : "✓"}
              </span>

              {/* Step */}
              <span className="text-zinc-400 w-36 truncate">
                {formatStep(event.step)}
              </span>

              {/* Scanned value */}
              <span className="text-zinc-300 w-32 truncate">
                {event.scannedValue || "—"}
              </span>

              {/* Result */}
              <span
                className={`w-24 truncate ${isError ? "text-red-400" : "text-green-500"}`}
              >
                {event.result}
              </span>

              {/* Response time */}
              <span className="text-zinc-500 w-16 text-right">
                {(event.responseTimeMs / 1000).toFixed(1)}s
              </span>

              {/* Injected label */}
              {event.injected && (
                <span className="text-yellow-500 text-[10px]">
                  ⚡ Injected
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Detail Panel */}
      {selectedEvent && (
        <div className="border-t border-zinc-800 px-4 py-3 bg-zinc-900/80 space-y-1">
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-zinc-500">
              Picker scanned:{" "}
              <span className="text-zinc-200">
                {selectedEvent.scannedValue || "—"}
              </span>
            </span>
            <span className="text-zinc-500">
              Expected:{" "}
              <span className="text-zinc-200">
                {selectedEvent.expectedValue || "—"}
              </span>
            </span>
          </div>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-zinc-500">
              Result:{" "}
              <span
                className={
                  isErrorResult(selectedEvent.result)
                    ? "text-red-400"
                    : "text-green-400"
                }
              >
                {selectedEvent.result}
              </span>
            </span>
            <span className="text-zinc-500">
              Time to scan:{" "}
              <span className="text-zinc-200">
                {(selectedEvent.responseTimeMs / 1000).toFixed(1)}s
              </span>
            </span>
            {selectedEvent.sopReference && (
              <span className="text-zinc-500">
                SOP:{" "}
                <span className="text-blue-400">
                  {selectedEvent.sopReference}
                </span>
              </span>
            )}
          </div>
          {selectedEvent.injected && (
            <p className="text-yellow-500 text-xs font-mono">
              ⚡ Injected scenario — error was deliberately triggered for training
            </p>
          )}
        </div>
      )}
    </div>
  )
}
