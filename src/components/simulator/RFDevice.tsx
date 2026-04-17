/**
 * RFDevice â€” RF Device terminal emulator (top-level simulator component)
 *
 * Manages input state and routes user interactions to the engine via
 * useSimulation.sendAction(). Orchestrates RFDeviceDisplay + SoftKeyBar.
 *
 * Visual appearance is driven entirely by the active device model from the
 * Zustand store â€” no hardcoded colors or fonts.
 *
 * Per CLAUDE.md Â§Architecture: components render and delegate â€” no business logic.
 * Business logic lives in useSimulation (Zustand) and the engine.
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { RFDeviceDisplay } from "./RFDeviceDisplay"
import { SoftKeyBar } from "./SoftKeyBar"
import { CoachingTooltip } from "./CoachingTooltip"
import { WT4000PhotoShell } from "./WT4000PhotoShell"
import { getDeviceModel, type RFDeviceModel } from "@/types/devices"
import {
  useSimulation,
  getInputMode,
  getEnterKeyAction,
  getSoftKeyEnabled,
  selectScreen,
  selectIsComplete,
} from "@/hooks/useSimulation"
import { getExpectedKey } from "@/lib/stepKeyMap"
import { getExpectedInputType } from "@/lib/stepKeyMap"
import type { EngineResult, SimulationSession } from "@/types/domain"
import type { CoachingState } from "@/types/coaching"

export function RFDevice() {
  const { session, result, sendAction, activeDeviceModelId, coaching, lastActionResult } = useSimulation()
  const [inputValue, setInputValue] = useState("")
  // Bug 5: track inline input errors (empty scan guard) without incrementing
  // session.errors or triggering error injection
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive visual config from the active device model.
  const device = getDeviceModel(activeDeviceModelId)
  const { screen: sc, layout: ly } = device
  const emulatorWidth = device.emulatorWidthPx ?? 320
  const touchTarget = device.minTouchTargetPx ?? 44
  const isModern = device.uiStyle === "modern"

  // Focus input on step change (scanner flow)
  useEffect(() => {
    if (!session) return
    const mode = getInputMode(session.currentStep, selectScreen(session).inputType)
    if (mode !== "CONFIRM" && !selectIsComplete(session)) {
      inputRef.current?.focus()
    }
  }, [session?.currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    if (!session) return
    if (selectIsComplete(session)) return

    const rfScreen = selectScreen(session)
    const mode = getInputMode(session.currentStep, rfScreen.inputType)

    // Bug 5: guard empty input â€” do not dispatch SCAN/TYPE with blank value.
    // Empty scans would increment session.errors and corrupt the score.
    if ((mode === "SCAN" || mode === "TYPE") && !inputValue.trim()) {
      setInputError(
        mode === "SCAN"
          ? "Please scan or enter a barcode first"
          : "Please enter a value first"
      )
      return
    }
    setInputError(null)

    if (mode === "SCAN") {
      sendAction({ type: "SCAN", value: inputValue })
    } else if (mode === "TYPE") {
      sendAction({ type: "TYPE", text: inputValue })
    } else {
      sendAction({ type: "CONFIRM", step: session.currentStep })
    }
    setInputValue("")
  }, [session, inputValue, sendAction])

  const handleSoftKey = useCallback(
    (keys: string) => {
      if (!session) return
      if (selectIsComplete(session)) return

      if (keys === "ENTER") {
        sendAction(getEnterKeyAction(session.currentStep))
      } else {
        sendAction({ type: "KEY_PRESS", keys })
      }
      setInputValue("")
      inputRef.current?.focus()
    },
    [session, sendAction]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        // Clear any inline input error on Enter so user gets fresh feedback
        setInputError(null)
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  if (!session) return null

  const rfScreen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, rfScreen.inputType)
  const isComplete = selectIsComplete(session)
  const showFeedback = result && !result.success && result.feedback
  const isAndroid = device.uiStyle === "android"
  const isWT4000 = device.modelId === "SYMBOL_WT4000"

  // Bug 4: derive per-key enabled state from engine for the current step.
  // CTRL+E, ^A, ^T, ^W, ^K are all gated â€” only the valid key pulses and is clickable.
  const softKeyEnabled = getSoftKeyEnabled(session)

  // Animation classes driven by lastActionResult
  const animClass =
    lastActionResult === "correct"
      ? "scanning success-pulse"
      : lastActionResult === "error"
        ? "error-shake"
        : ""

  // â”€â”€ WT4000 wrist terminal: photo-realistic shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isWT4000) {
    return (
      <WT4000PhotoShell
        device={device}
        animClass={animClass}
        lastActionResult={lastActionResult}
        rfScreen={rfScreen}
        inputValue={inputValue}
        inputMode={inputMode}
        isComplete={isComplete}
        showFeedback={showFeedback}
        result={result}
        inputError={inputError}
        session={session}
        coaching={coaching}
        softKeyEnabled={softKeyEnabled}
        inputRef={inputRef}
        handleSubmit={handleSubmit}
        handleKeyDown={handleKeyDown}
        handleSoftKey={handleSoftKey}
        setInputValue={setInputValue}
      />
    )
  }

  return (
    <div
      className={`rounded-2xl p-4 shadow-2xl flex flex-col gap-3 ${animClass}`}
      style={{
        backgroundColor: ly.bezelColor,
        border: `1px solid ${ly.screenBorderColor}`,
        width: emulatorWidth,
        maxWidth: "100%",
        position: "relative",
      }}
    >
      {/* Scan beam overlay */}
      {lastActionResult === "correct" && (
        <div className="scan-beam" />
      )}

      {/* Device label */}
      <div
        className="text-[9px] font-mono text-center tracking-widest uppercase"
        style={{ color: isModern ? "var(--color-text-muted)" : isAndroid ? "#94a3b8" : "#4b5563" }}
      >
        {device.displayName} â€” GEODIS RF
      </div>

      {/* Screen â€” relative container holds RFDeviceDisplay + CoachingTooltip arrow */}
      <div
        style={{
          position: "relative",
          border: `1px solid ${ly.screenBorderColor}`,
          borderRadius: isModern ? "var(--radius-md)" : undefined,
          overflow: "hidden",
        }}
      >
        <RFDeviceDisplay
          screen={rfScreen}
          inputValue={inputValue}
          screenConfig={sc}
          highlightLine={coaching.content?.highlightLine}
          renderMode={device.uiStyle}
          stepName={session.currentStep.replace(/_/g, " ")}
        />
        <CoachingTooltip
          highlightLine={coaching.content?.highlightLine}
          screenLineCount={rfScreen.lines.length}
          isVisible={coaching.isVisible}
        />
      </div>

      {/* Feedback strip â€” shows engine error feedback OR inline input error */}
      <div className="min-h-[28px]">
        {/* Inline input validation error (Bug 5) â€” does NOT increment error counter */}
        {inputError && !showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: isModern ? "rgba(240, 165, 0, 0.1)" : isAndroid ? "#fffbeb" : "#1c1000",
              border: isModern
                ? "1px solid var(--color-amber)"
                : `1px solid ${isAndroid ? "#fcd34d" : "#78350f"}`,
              color: isModern ? "var(--color-amber)" : isAndroid ? "#b45309" : "#fcd34d",
              fontFamily: sc.fontFamily,
            }}
          >
            {inputError}
          </div>
        )}
        {/* Engine error feedback */}
        {showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: isModern ? "rgba(248, 81, 73, 0.1)" : isAndroid ? "#fff1f2" : "#1c0505",
              border: isModern
                ? "1px solid var(--color-danger)"
                : `1px solid ${isAndroid ? "#fca5a5" : "#7f1d1d"}`,
              color: isModern ? "var(--color-danger)" : isAndroid ? "#dc2626" : "#fca5a5",
              fontFamily: sc.fontFamily,
            }}
          >
            {result.feedback}
          </div>
        )}
        {result?.success && !showFeedback && !inputError && (
          <div
            className="text-[10px] font-mono text-center"
            style={{ color: isModern ? "var(--color-success)" : isAndroid ? "#16a34a" : "#15803d" }}
          >
            âœ“ OK
          </div>
        )}
      </div>

      {/* Input area */}
      {!isComplete && (() => {
        const expectedInput = getExpectedInputType(session.currentStep)
        // On scan steps, hide the text input â€” user scans via warehouse floor
        if (expectedInput === "scan") {
          return (
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("warehouse-floor")
                if (!el) return
                el.scrollIntoView({ behavior: "smooth", block: "nearest" })
                el.classList.add("floor-flash")
                setTimeout(() => el.classList.remove("floor-flash"), 900)
              }}
              className="text-[10px] font-mono text-center py-2 rounded w-full transition-opacity hover:opacity-80 active:opacity-60"
              style={{
                backgroundColor: isModern ? "var(--color-surface)" : isAndroid ? "#f8fafc" : "#18181b",
                color: isModern ? "var(--color-amber)" : isAndroid ? "#b45309" : "#fcd34d",
                border: `1px dashed ${isModern ? "var(--color-amber)" : isAndroid ? "#fcd34d" : "#713f12"}`,
                minHeight: touchTarget,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              â†™ Scan on Warehouse Floor
            </button>
          )
        }
        // On keypress steps, the soft key bar handles it â€” no input shown
        if (expectedInput === "keypress") {
          return null
        }
        // Text input for TYPE steps, Continue button for CONFIRM/none steps
        return inputMode !== "CONFIRM" ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm px-3 rounded border focus:outline-none transition-colors"
                style={{
                  backgroundColor: isModern ? "var(--color-surface)" : sc.bgColor,
                  color: isModern ? "var(--color-text-primary)" : sc.textColor,
                  fontFamily: sc.fontFamily,
                  borderColor: isModern ? "var(--color-border)" : ly.screenBorderColor,
                  minHeight: touchTarget,
                }}
                placeholder={inputMode === "SCAN" ? "Scan barcodeâ€¦" : "Enter valueâ€¦"}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                className="text-xs font-mono px-3 rounded border transition-colors"
                style={{
                  backgroundColor: isModern ? "var(--color-amber)" : isAndroid ? "#2563eb" : "#14532d",
                  color: isModern ? "var(--color-base)" : isAndroid ? "#ffffff" : "#bbf7d0",
                  borderColor: isModern ? "var(--color-amber-dim)" : isAndroid ? "#1d4ed8" : "#166534",
                  fontFamily: sc.fontFamily,
                  fontWeight: isModern ? 700 : undefined,
                  minHeight: touchTarget,
                }}
              >
                {inputMode === "SCAN" ? "SCAN" : "ENTER"}
              </button>
            </div>
          ) : (
            // Hide Continue on key-only steps â€” the trainee must press the pulsing soft key.
            // getExpectedKey returns the key string if this step has no CONFIRM transition.
            !getExpectedKey(session.currentStep) && (
              <button
                onClick={handleSubmit}
                className="w-full text-sm font-mono py-2 rounded border transition-colors"
                style={{
                  backgroundColor: isModern ? "var(--color-surface-2)" : isAndroid ? "#f1f5f9" : "#27272a",
                  color: isModern ? "var(--color-text-primary)" : sc.textColor,
                  borderColor: isModern ? "var(--color-border)" : ly.screenBorderColor,
                  fontFamily: sc.fontFamily,
                  minHeight: touchTarget,
                }}
              >
                Continue
              </button>
            )
          )
      })()}

      {/* Soft key row â€” highlightKey pulses on key-only steps; enabledKeys dims invalid keys */}
      <SoftKeyBar
        onKey={handleSoftKey}
        disabled={isComplete}
        uiStyle={device.uiStyle}
        highlightKey={session ? getExpectedKey(session.currentStep) : undefined}
        enabledKeys={softKeyEnabled}
      />

      {/* Step indicator (training aid) */}
      <div
        className="text-[9px] font-mono text-center truncate"
        style={{ color: isModern ? "var(--color-text-muted)" : isAndroid ? "#94a3b8" : "#3f3f46" }}
      >
        {session.currentStep}
      </div>
    </div>
  )
}
// â”€â”€â”€ WT4000Shell has been replaced by WT4000PhotoShell (WT4000PhotoShell.tsx)
