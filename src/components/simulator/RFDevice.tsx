/**
 * RFDevice — RF Device terminal emulator (top-level simulator component)
 *
 * Manages input state and routes user interactions to the engine via
 * useSimulation.sendAction(). Orchestrates RFDeviceDisplay + SoftKeyBar.
 *
 * Per CLAUDE.md §Architecture: components render and delegate — no business logic.
 * Business logic lives in useSimulation (Zustand) and the engine.
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { RFDeviceDisplay } from "./RFDeviceDisplay"
import { SoftKeyBar } from "./SoftKeyBar"
import {
  useSimulation,
  getInputMode,
  getEnterKeyAction,
  selectScreen,
  selectIsComplete,
} from "@/hooks/useSimulation"

export function RFDevice() {
  const { session, result, sendAction } = useSimulation()
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

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

    const screen = selectScreen(session)
    const mode = getInputMode(session.currentStep, screen.inputType)

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
        // getEnterKeyAction handles ENTER+ENTER for BC_CONFIRM_TASK_GROUP
        // and CONFIRM for all other steps. Per BBWD-WI-030 §5.1.8.
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

  const screen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, screen.inputType)
  const isComplete = selectIsComplete(session)
  const showFeedback = result && !result.success && result.feedback

  return (
    <div className="bg-zinc-800 rounded-2xl p-4 w-[320px] shadow-2xl border border-zinc-700 flex flex-col gap-3">
      {/* Manufacturer label */}
      <div className="text-zinc-500 text-[9px] font-mono text-center tracking-widest uppercase">
        GEODIS — RF Terminal
      </div>

      {/* Screen bezel */}
      <div className="bg-zinc-900 rounded-lg p-2 border border-zinc-700">
        <RFDeviceDisplay screen={screen} inputValue={inputValue} />
      </div>

      {/* Feedback strip */}
      <div className="min-h-[28px]">
        {showFeedback && (
          <div className="bg-red-950 border border-red-800 rounded px-2 py-1 text-red-300 text-xs font-mono">
            {result.feedback}
          </div>
        )}
        {result?.success && !showFeedback && (
          <div className="text-green-700 text-[10px] font-mono text-center">
            OK
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
                className="
                  flex-1 bg-zinc-900 text-green-400 font-mono text-sm
                  px-3 py-2 rounded border border-zinc-600
                  focus:outline-none focus:border-green-600
                  placeholder-zinc-700
                "
                placeholder={
                  inputMode === "SCAN" ? "Scan barcode…" : "Enter value…"
                }
                autoFocus
              />
              <button
                onClick={handleSubmit}
                className="
                  bg-green-800 hover:bg-green-700 active:bg-green-600
                  text-green-100 text-xs font-mono px-3 rounded
                  border border-green-700 transition-colors
                "
              >
                {inputMode === "SCAN" ? "SCAN" : "ENTER"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubmit}
              className="
                w-full bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500
                text-green-400 font-mono text-sm py-2 rounded
                border border-zinc-600 transition-colors
              "
            >
              Continue
            </button>
          )}
        </>
      )}

      {/* Soft key row */}
      <SoftKeyBar onKey={handleSoftKey} disabled={isComplete} />

      {/* Step indicator (training aid — shows current workflow step) */}
      <div className="text-zinc-700 text-[9px] font-mono text-center truncate">
        {session.currentStep}
      </div>
    </div>
  )
}
