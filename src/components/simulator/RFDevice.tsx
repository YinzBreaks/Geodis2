/**
 * RFDevice — Kinetic OS WMS Industrial Terminal HUD
 *
 * Full-bleed tablet ergonomics replacing legacy photo shells.
 * Manages input state and routes user interactions to the engine via
 * useSimulation.processInput() (canonical input contract).
 */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { SymbolWT4090Terminal } from "./SymbolWT4090Terminal"
import {
  useSimulation,
  getInputMode,
  getSoftKeyEnabled,
  selectScreen,
  selectIsComplete,
} from "@/hooks/useSimulation"
import { playSuccessBeep, playErrorBuzz } from "@/lib/audio"

export function RFDevice() {
  const session = useSimulation((s) => s.session)
  const result = useSimulation((s) => s.result)
  const processInput = useSimulation((s) => s.processInput)
  const coaching = useSimulation((s) => s.coaching)
  const lastActionResult = useSimulation((s) => s.lastActionResult)
  const [inputValue, setInputValue] = useState("")
  const [inputError, setInputError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Audio cues on action results
  useEffect(() => {
    if (lastActionResult === "correct") {
      playSuccessBeep()
    } else if (lastActionResult === "error") {
      playErrorBuzz()
    }
  }, [lastActionResult])

  // Clear input value when step changes
  useEffect(() => {
    setInputValue("")
    setInputError(null)
  }, [session?.currentStep])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!session) return

      const rfScreen = selectScreen(session)
      const inputMode = getInputMode(session.currentStep, rfScreen.inputType)

      if (inputMode === "SCAN") {
        if (!inputValue.trim()) {
          setInputError("SCAN REQUIRED")
          return
        }
        processInput({ type: "SCAN", value: inputValue.trim(), source: "keyboard" })
      } else if (inputMode === "TYPE") {
        if (!inputValue.trim()) {
          setInputError("QUANTITY REQUIRED")
          return
        }
        processInput({ type: "QUANTITY", value: inputValue.trim(), source: "keyboard" })
      } else {
        processInput({ type: "CONFIRM", value: "", source: "click" })
      }
      setInputValue("")
      setInputError(null)
    },
    [session, inputValue, processInput]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  const handleSoftKey = useCallback(
    (key: string) => {
      processInput({ type: "SOFTKEY", value: key, source: "click" })
    },
    [processInput]
  )

  if (!session) return null

  const rfScreen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, rfScreen.inputType)
  const isComplete = selectIsComplete(session)
  const showFeedback = Boolean(result && !result.success && result.feedback)
  const softKeyEnabled = getSoftKeyEnabled(session)

  const animClass =
    lastActionResult === "correct"
      ? "scanning success-pulse"
      : lastActionResult === "error"
        ? "error-shake"
        : ""

  return (
    <SymbolWT4090Terminal
      session={session}
      rfScreen={rfScreen}
      inputValue={inputValue}
      inputMode={inputMode}
      isComplete={isComplete}
      result={result}
      inputError={inputError}
      coaching={coaching}
      softKeyEnabled={softKeyEnabled}
      handleSubmit={handleSubmit}
      handleKeyDown={handleKeyDown}
      handleSoftKey={handleSoftKey}
      setInputValue={setInputValue}
    />
  )
}
