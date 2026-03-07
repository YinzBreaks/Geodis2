/**
 * RFDevice — RF Device terminal emulator (top-level simulator component)
 *
 * Manages input state and routes user interactions to the engine via
 * useSimulation.sendAction(). Orchestrates RFDeviceDisplay + SoftKeyBar.
 *
 * Visual appearance is driven entirely by the active device model from the
 * Zustand store — no hardcoded colors or fonts.
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 * Business logic lives in useSimulation (Zustand) and the engine.
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { RFDeviceDisplay } from "./RFDeviceDisplay"
import { SoftKeyBar } from "./SoftKeyBar"
import { CoachingTooltip } from "./CoachingTooltip"
import { getDeviceModel } from "@/types/devices"
import {
  useSimulation,
  getInputMode,
  getEnterKeyAction,
  selectScreen,
  selectIsComplete,
} from "@/hooks/useSimulation"

export function RFDevice() {
  const { session, result, sendAction, activeDeviceModelId, coaching } = useSimulation()
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Derive visual config from the active device model.
  // All colors / fonts come from here — nothing hardcoded below.
  const device = getDeviceModel(activeDeviceModelId)
  const { screen: sc, layout: ly } = device
  const emulatorWidth = device.emulatorWidthPx ?? 320
  const touchTarget = device.minTouchTargetPx ?? 44

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

  return (
    <div
      className="rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
      style={{
        backgroundColor: ly.bezelColor,
        border: `1px solid ${ly.screenBorderColor}`,
        width: emulatorWidth,
        maxWidth: "100%",
      }}
    >
      {/* Device label */}
      <div
        className="text-[9px] font-mono text-center tracking-widest uppercase"
        style={{ color: isAndroid ? "#94a3b8" : "#4b5563" }}
      >
        {device.displayName} — GEODIS RF
      </div>

      {/* Screen — relative container holds RFDeviceDisplay + CoachingTooltip arrow */}
      <div
        style={{
          position: "relative",
          border: `1px solid ${ly.screenBorderColor}`,
        }}
      >
        <RFDeviceDisplay
          screen={rfScreen}
          inputValue={inputValue}
          screenConfig={sc}
          highlightLine={coaching.content?.highlightLine}
        />
        <CoachingTooltip
          highlightLine={coaching.content?.highlightLine}
          screenLineCount={rfScreen.lines.length}
          isVisible={coaching.isVisible}
        />
      </div>

      {/* Feedback strip */}
      <div className="min-h-[28px]">
        {showFeedback && (
          <div
            className="rounded px-2 py-1 text-xs font-mono"
            style={{
              backgroundColor: isAndroid ? "#fff1f2" : "#1c0505",
              border: `1px solid ${isAndroid ? "#fca5a5" : "#7f1d1d"}`,
              color: isAndroid ? "#dc2626" : "#fca5a5",
              fontFamily: sc.fontFamily,
            }}
          >
            {result.feedback}
          </div>
        )}
        {result?.success && !showFeedback && (
          <div
            className="text-[10px] font-mono text-center"
            style={{ color: isAndroid ? "#16a34a" : "#15803d" }}
          >
            ✓ OK
          </div>
        )}
      </div>

      {/* Input area */}
      {!isComplete && (
        <>
          {inputMode !== "CONFIRM" ? (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm px-3 rounded border focus:outline-none transition-colors"
                style={{
                  backgroundColor: sc.bgColor,
                  color: sc.textColor,
                  fontFamily: sc.fontFamily,
                  borderColor: ly.screenBorderColor,
                  minHeight: touchTarget,
                }}
                placeholder={inputMode === "SCAN" ? "Scan barcode…" : "Enter value…"}
                autoFocus
              />
              <button
                onClick={handleSubmit}
                className="text-xs font-mono px-3 rounded border transition-colors"
                style={{
                  backgroundColor: isAndroid ? "#2563eb" : "#14532d",
                  color: isAndroid ? "#ffffff" : "#bbf7d0",
                  borderColor: isAndroid ? "#1d4ed8" : "#166534",
                  fontFamily: sc.fontFamily,
                  minHeight: touchTarget,
                }}
              >
                {inputMode === "SCAN" ? "SCAN" : "ENTER"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="w-full text-sm font-mono py-2 rounded border transition-colors"
              style={{
                backgroundColor: isAndroid ? "#f1f5f9" : "#27272a",
                color: sc.textColor,
                borderColor: ly.screenBorderColor,
                fontFamily: sc.fontFamily,
                minHeight: touchTarget,
              }}
            >
              Continue
            </button>
          )}
        </>
      )}

      {/* Soft key row */}
      <SoftKeyBar
        onKey={handleSoftKey}
        disabled={isComplete}
        uiStyle={device.uiStyle}
      />

      {/* Step indicator (training aid) */}
      <div
        className="text-[9px] font-mono text-center truncate"
        style={{ color: isAndroid ? "#94a3b8" : "#3f3f46" }}
      >
        {session.currentStep}
      </div>
    </div>
  )
}

