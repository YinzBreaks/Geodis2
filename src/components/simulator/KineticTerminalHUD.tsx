"use client"

import React, { useRef, useEffect } from "react"
import type {
  RFDeviceScreen,
  SimulationSession,
  EngineResult,
} from "@/types/domain"
import type { CoachingState } from "@/types/coaching"
import type { InputMode } from "@/hooks/useSimulation"
import { RFDeviceDisplay } from "@/components/simulator/RFDeviceDisplay"
import { HardwareScannerPill } from "@/components/simulator/HardwareScannerPill"

export interface KineticTerminalHUDProps {
  session: SimulationSession
  rfScreen: RFDeviceScreen
  inputValue: string
  inputMode: InputMode
  isComplete: boolean
  showFeedback?: boolean | null
  result: EngineResult | null
  inputError: string | null
  coaching: CoachingState
  animClass?: string
  softKeyEnabled?: Record<string, boolean>
  inputRef?: React.RefObject<HTMLInputElement | null>
  handleSubmit: (e: React.FormEvent) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleSoftKey: (key: string) => void
  setInputValue: (val: string) => void
  onPullTrigger?: () => void
}

export function KineticTerminalHUD({
  session,
  rfScreen,
  inputValue,
  inputMode,
  isComplete,
  showFeedback,
  result,
  inputError,
  coaching,
  animClass = "",
  softKeyEnabled = {},
  inputRef: externalInputRef,
  handleSubmit,
  handleKeyDown,
  handleSoftKey,
  setInputValue,
  onPullTrigger,
}: KineticTerminalHUDProps) {
  const fallbackRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef ?? fallbackRef

  // Keep hidden input focused for HID hardware ring scanners
  useEffect(() => {
    if (!isComplete) {
      inputRef.current?.focus()
    }
  }, [isComplete, session.currentStep, inputRef])

  const handleNumClick = (digit: string) => {
    setInputValue(inputValue + digit)
    inputRef.current?.focus()
  }

  const handleBackspace = () => {
    setInputValue(inputValue.slice(0, -1))
    inputRef.current?.focus()
  }

  const handleClear = () => {
    setInputValue("")
    inputRef.current?.focus()
  }

  const handleTriggerAction = () => {
    if (onPullTrigger) {
      onPullTrigger()
    } else {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    }
    inputRef.current?.focus()
  }

  return (
    <div
      className={`w-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden font-mono select-none ${animClass}`}
      style={{ minHeight: "560px" }}
    >
      {/* ── HIDDEN HARDWARE SCANNER INPUT ─────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="sr-only">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoFocus
        />
      </form>

      {/* ── TOP TERMINAL BAR ──────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
            WMS INDUSTRIAL TERMINAL
          </span>
          <span className="text-[10px] text-zinc-500 font-bold hidden sm:inline">
            | 20-COL EMULATION
          </span>
        </div>

        <HardwareScannerPill compact onTriggerScan={handleTriggerAction} />
      </div>

      {/* ── WMS MONOSPACE LCD SCREEN GLASS ────────────────────────────────── */}
      <div className="p-3 bg-zinc-950 flex-1 flex flex-col justify-center items-center">
        <div className="w-full max-w-sm bg-black border-2 border-zinc-800 rounded-xl p-3 shadow-inner relative retro-lcd-screen overflow-hidden">
          <RFDeviceDisplay
            screen={rfScreen}
            inputValue={inputValue}
            screenConfig={{
              bgColor: "#000000",
              textColor: "#22c55e", // Terminal Green
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
              highlightColor: "#f59e0b",
              cursorColor: "#22c55e",
              labelColor: "#15803d",
              fontSize: "13px",
              lineHeight: "1.4",
            }}
            padding="4px 6px"
            highlightLine={coaching.content?.highlightLine}
            renderMode="terminal"
            stepName={session.currentStep.replace(/_/g, " ")}
          />

          {/* Inline Feedback Banner */}
          {(showFeedback || inputError) && (
            <div className="mt-2 p-2 bg-rose-950/90 border border-rose-500/60 rounded text-[11px] font-mono text-rose-300 font-bold animate-pulse">
              {inputError ?? result?.feedback ?? "ERROR: RETRY SCAN"}
            </div>
          )}
        </div>
      </div>

      {/* ── INDUSTRIAL GLOVE TOUCH PANEL (>=52px Targets, >=8px Gutters) ───── */}
      <div className="bg-zinc-900/90 border-t border-zinc-800 p-3.5 flex flex-col gap-2.5 shrink-0">
        {/* Exception Soft-Key Thumb Row (Left Thumb Zone) */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_K")}
            className={`glove-target text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              softKeyEnabled["CTRL_K"]
                ? "bg-amber-950/80 text-amber-300 border-amber-500/60 hover:bg-amber-900"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span className="text-[9px] text-zinc-500">CTRL+K</span>
            <span>SHORT</span>
          </button>

          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_M")}
            className={`glove-target text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              softKeyEnabled["CTRL_M"]
                ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/60 hover:bg-cyan-900"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span className="text-[9px] text-zinc-500">CTRL+M</span>
            <span>MANUAL</span>
          </button>

          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_D")}
            className={`glove-target text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              softKeyEnabled["CTRL_D"]
                ? "bg-rose-950/80 text-rose-300 border-rose-500/60 hover:bg-rose-900"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span className="text-[9px] text-zinc-500">CTRL+D</span>
            <span>DAMAGE</span>
          </button>

          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_H")}
            className={`glove-target text-[11px] font-bold rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
              softKeyEnabled["CTRL_H"]
                ? "bg-purple-950/80 text-purple-300 border-purple-500/60 hover:bg-purple-900"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span className="text-[9px] text-zinc-500">CTRL+H</span>
            <span>HAZMAT</span>
          </button>
        </div>

        {/* Integrated Numeric Keypad & Primary Trigger (Dual-Handed Sweep) */}
        <div className="grid grid-cols-12 gap-2">
          {/* Left: 9-Key Numeric Matrix (Cols 1-8) */}
          <div className="col-span-8 grid grid-cols-3 gap-2 font-mono">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumClick(num)}
                className="glove-target-primary bg-zinc-800/90 hover:bg-zinc-700 active:bg-zinc-600 text-white font-bold text-base rounded-xl border border-zinc-700/80 transition-all cursor-pointer flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="glove-target bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl border border-zinc-800 transition-all cursor-pointer flex items-center justify-center"
            >
              CLR
            </button>
            <button
              type="button"
              onClick={() => handleNumClick("0")}
              className="glove-target-primary bg-zinc-800/90 hover:bg-zinc-700 active:bg-zinc-600 text-white font-bold text-base rounded-xl border border-zinc-700/80 transition-all cursor-pointer flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="glove-target bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold rounded-xl border border-zinc-800 transition-all cursor-pointer flex items-center justify-center"
            >
              ⌫
            </button>
          </div>

          {/* Right: Primary Glove Trigger Zone (Cols 9-12) */}
          <div className="col-span-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleTriggerAction}
              className="flex-1 glove-target-primary bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 border border-emerald-400"
            >
              <span className="text-xl">⚡</span>
              <span>TRIGGER</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              className="glove-target-primary bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              ENTER &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
