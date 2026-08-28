/**
 * ScannerPanel — Manual barcode input + scan feedback panel
 *
 * Provides a secondary input method for the simulation:
 *   - Text field for manual barcode entry (fallback)
 *   - Hold-to-scan button with laser animation and audio feedback
 *   - Recent scan history log
 *   - Spacebar shortcut for desktop users
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 * Per CLAUDE.md §Code Standards: useScanner hook is the ONLY way components interact
 * with scan events — this panel routes all scans through the parent's onScan callback.
 */
"use client"

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react"
import { WorkflowStep, ScanResult, type SimulationSession, type ScanEvent } from "@/types/domain"
import { selectScreen, getInputMode } from "@/hooks/useSimulation"
// Shared synthesized sound set — routing through lib/audio keeps this panel
// covered by the global mute toggle (a private AudioContext here would not be).
import { sounds } from "@/lib/audio"

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface ScannerPanelProps {
  session: SimulationSession
  /** Submit a SCAN action with the given barcode value */
  onScan: (barcode: string) => void
  /** Submit a TYPE action with the given text */
  onType: (text: string) => void
  /** Submit a CONFIRM action for the current step */
  onConfirm: () => void
  /** Most recent engine result — shows success/failure feedback */
  lastSuccess: boolean | null
  lastFeedback: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO FEEDBACK
// Per task spec: success beep 880hz 80ms via Web Audio API (see lib/audio.ts)
// ─────────────────────────────────────────────────────────────────────────────

const playSuccessBeep = sounds.scanSuccess
const playErrorBeep = sounds.scanError

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function ScannerPanel({
  session,
  onScan,
  onType,
  onConfirm,
  lastSuccess,
  lastFeedback,
}: ScannerPanelProps) {
  const [inputValue, setInputValue] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const screen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, screen.inputType)
  const isComplete = session.currentStep === WorkflowStep.PS_ROUND_COMPLETE

  // Play audio feedback on result change
  const prevSuccessRef = useRef<boolean | null>(null)
  useEffect(() => {
    if (lastSuccess === null || lastSuccess === prevSuccessRef.current) return
    prevSuccessRef.current = lastSuccess
    if (lastSuccess) {
      playSuccessBeep()
    } else {
      playErrorBeep()
    }
  }, [lastSuccess])

  // Focus input on step change
  useEffect(() => {
    if (!isComplete && inputMode !== "CONFIRM") {
      inputRef.current?.focus()
    }
  }, [session.currentStep, inputMode, isComplete])

  // ── Submit handler ──────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (isComplete) return
    if (!inputValue.trim()) return

    if (inputMode === "SCAN") {
      onScan(inputValue.trim())
    } else if (inputMode === "TYPE") {
      onType(inputValue.trim())
    }
    setInputValue("")
  }, [inputValue, inputMode, isComplete, onScan, onType])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  // ── Hold-to-scan trigger ────────────────────────────────────────────
  // mousedown/touchstart → start scanning animation
  // mouseup/touchend → submit scan after minimum 300ms hold

  const handleScanStart = useCallback(() => {
    if (isComplete || inputMode === "CONFIRM") return
    setIsScanning(true)
    scanTimerRef.current = setTimeout(() => {
      // Auto-stop after 2s max
      setIsScanning(false)
    }, 2000)
  }, [isComplete, inputMode])

  const handleScanEnd = useCallback(() => {
    if (!isScanning) return
    setIsScanning(false)
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current)
      scanTimerRef.current = null
    }
    // Submit the current input value as a scan
    if (inputValue.trim()) {
      if (inputMode === "SCAN") {
        onScan(inputValue.trim())
      } else {
        onType(inputValue.trim())
      }
      setInputValue("")
    }
  }, [isScanning, inputValue, inputMode, onScan, onType])

  // ── Spacebar shortcut ───────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (
        e.code === "Space" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault()
        handleScanStart()
      }
    }

    function onKeyUp(e: globalThis.KeyboardEvent) {
      if (e.code === "Space") {
        handleScanEnd()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [handleScanStart, handleScanEnd])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current)
    }
  }, [])

  // Recent scans (last 5)
  const recentScans = session.scanEvents.slice(-5).reverse()

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            isScanning ? "bg-red-500 animate-pulse" : "bg-green-500"
          }`}
        />
        <h2 className="text-slate-300 font-semibold text-sm tracking-wide">
          Scanner
        </h2>
        <span className="text-slate-600 text-[10px] font-mono ml-auto">
          {inputMode === "SCAN"
            ? "BARCODE"
            : inputMode === "TYPE"
              ? "KEYPAD"
              : "READY"}
        </span>
      </div>

      {/* Scan target indicator */}
      <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div className="text-slate-500 text-[10px] font-mono mb-1">
          {screen.activeField ?? "Waiting..."}
        </div>
        <div className="text-slate-300 text-xs font-mono">
          {inputMode === "SCAN"
            ? "Enter barcode or click item on floor"
            : inputMode === "TYPE"
              ? `Enter value (e.g. ${screen.contextualData?.slot ?? ""})`
              : "Physical action — use Continue button"}
        </div>
      </div>

      {/* Input area */}
      {!isComplete && inputMode !== "CONFIRM" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="
                flex-1 bg-slate-800 text-green-400 font-mono text-sm
                px-3 py-2 rounded-lg border border-slate-600
                focus:outline-none focus:border-green-600
                placeholder-slate-600
              "
              placeholder={inputMode === "SCAN" ? "Scan barcode…" : "Enter value…"}
              disabled={isComplete}
            />
            <button
              onClick={handleSubmit}
              className="
                bg-green-800 hover:bg-green-700 active:bg-green-600
                text-green-100 text-xs font-mono px-3 rounded-lg
                border border-green-700 transition-colors
              "
            >
              ↵
            </button>
          </div>

          {/* Hold-to-scan trigger button */}
          <button
            onMouseDown={handleScanStart}
            onMouseUp={handleScanEnd}
            onMouseLeave={handleScanEnd}
            onTouchStart={handleScanStart}
            onTouchEnd={handleScanEnd}
            className={`
              relative w-full py-3 rounded-lg font-mono text-sm
              border transition-all select-none
              ${
                isScanning
                  ? "bg-red-900 border-red-600 text-red-200"
                  : "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700"
              }
            `}
          >
            {isScanning ? (
              <span className="flex items-center justify-center gap-2">
                {/* Laser animation */}
                <span className="w-8 h-0.5 bg-red-500 animate-pulse rounded" />
                SCANNING...
                <span className="w-8 h-0.5 bg-red-500 animate-pulse rounded" />
              </span>
            ) : (
              <span>Hold to Scan (or Spacebar)</span>
            )}
          </button>
        </div>
      )}

      {/* Confirm button for physical action steps */}
      {!isComplete && inputMode === "CONFIRM" && (
        <button
          onClick={onConfirm}
          className="
            w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500
            text-green-400 font-mono text-sm py-3 rounded-lg
            border border-slate-600 transition-colors
          "
        >
          Continue
        </button>
      )}

      {/* Feedback strip */}
      {lastFeedback && (
        <div
          className={`rounded-lg px-3 py-2 text-xs font-mono ${
            lastSuccess
              ? "bg-green-950 border border-green-800 text-green-400"
              : "bg-red-950 border border-red-800 text-red-400"
          }`}
        >
          {lastSuccess ? "✓ " : "✗ "}
          {lastFeedback}
        </div>
      )}

      {/* Recent scan log */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-slate-600 text-[10px] font-mono mb-1">
          Recent Scans
        </div>
        {recentScans.length === 0 && (
          <div className="text-slate-700 text-[10px] font-mono">
            No scans yet
          </div>
        )}
        {recentScans.map((scan: ScanEvent) => (
          <div
            key={scan.scanEventId}
            className={`text-[10px] font-mono py-0.5 ${
              scan.result === ScanResult.SUCCESS
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {scan.result === ScanResult.SUCCESS ? "✓" : "✗"}{" "}
            {scan.scannedValue.slice(0, 16)}
          </div>
        ))}
      </div>

      {/* Spacebar hint */}
      <div className="text-slate-700 text-[9px] font-mono text-center">
        Spacebar = hold to scan · Enter = submit
      </div>
    </div>
  )
}
