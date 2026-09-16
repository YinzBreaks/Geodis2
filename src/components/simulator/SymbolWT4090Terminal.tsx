"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import type { SimulationSession, RFDeviceScreen, EngineResult } from "@/types/domain"
import type { CoachingState } from "@/types/coaching"
import { playKeyClick, playSuccessBeep, playErrorBuzz } from "@/lib/audio"

export interface SymbolWT4090TerminalProps {
  session: SimulationSession
  rfScreen: RFDeviceScreen
  inputValue: string
  inputMode: "SCAN" | "TYPE" | "CONFIRM"
  isComplete?: boolean
  result?: EngineResult | null
  inputError?: string | null
  coaching?: CoachingState
  softKeyEnabled?: Record<string, boolean>
  handleSubmit: (e: React.FormEvent) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleSoftKey: (key: string) => void
  setInputValue: (val: string) => void
  onPullTrigger?: () => void
  isBeat3Prompt?: boolean
  onHelpProtocol?: () => void
}

export function SymbolWT4090Terminal({
  session,
  rfScreen,
  inputValue,
  inputMode,
  isComplete = false,
  result,
  inputError,
  coaching,
  softKeyEnabled = {},
  handleSubmit,
  handleKeyDown,
  handleSoftKey,
  setInputValue,
  onPullTrigger,
  isBeat3Prompt = false,
  onHelpProtocol,
}: SymbolWT4090TerminalProps) {
  const [ctrlActive, setCtrlActive] = useState(false)
  const [shiftActive, setShiftActive] = useState(false)
  const [backlightOn, setBacklightOn] = useState(true)
  const [decodeLed, setDecodeLed] = useState(false)
  const [errorLed, setErrorLed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus hidden input for physical keyboard wedge intercept
  useEffect(() => {
    inputRef.current?.focus()
  }, [session.currentStep, inputValue])

  // LED Flash Reactivity
  useEffect(() => {
    if (result) {
      if (result.success) {
        setDecodeLed(true)
        playSuccessBeep()
        const t = setTimeout(() => setDecodeLed(false), 150)
        return () => clearTimeout(t)
      } else {
        setErrorLed(true)
        playErrorBuzz()
        const t = setTimeout(() => setErrorLed(false), 300)
        return () => clearTimeout(t)
      }
    }
  }, [result])

  // Key tap handler
  const handleKeyTap = useCallback(
    (char: string, altChar?: string, ctrlCombo?: string) => {
      playKeyClick()

      if (ctrlActive && ctrlCombo) {
        handleSoftKey(ctrlCombo)
        setCtrlActive(false)
        return
      }

      if (shiftActive && altChar) {
        setInputValue(inputValue + altChar)
        setShiftActive(false)
        return
      }

      setInputValue(inputValue + char)
    },
    [ctrlActive, shiftActive, inputValue, handleSoftKey, setInputValue]
  )

  const handleBackspace = useCallback(() => {
    playKeyClick()
    setInputValue(inputValue.slice(0, -1))
  }, [inputValue, setInputValue])

  const handleEnterTap = useCallback(() => {
    playKeyClick()
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
    handleSubmit(syntheticEvent)
  }, [handleSubmit])

  const handleTriggerClick = useCallback(() => {
    playKeyClick()
    if (onPullTrigger) {
      onPullTrigger()
    } else {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(syntheticEvent)
    }
  }, [onPullTrigger, handleSubmit])

  const toggleBacklight = useCallback(() => {
    playKeyClick()
    setBacklightOn((prev) => !prev)
  }, [])

  // Format screen lines to strict 20-character width
  const pad20 = (str: string) => str.padEnd(20).slice(0, 20)

  return (
    <div className="relative flex flex-col items-center select-none font-sans">
      {/* Hidden input to capture physical USB/Bluetooth ring scanner keystrokes */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 pointer-events-none absolute h-0 w-0"
        autoFocus
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* ── SYMBOL WT4090 INDUSTRIAL POLYCARBONATE HOUSING ───────────────── */}
      <div className="w-[390px] bg-[#1E2226] border-2 border-[#32383E] rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.15)] flex flex-col relative">
        {/* Rubberized side bumper grips (left and right) */}
        <div className="absolute -left-1.5 top-16 bottom-20 w-2 bg-[#121417] rounded-l-md border-l border-y border-[#2E3338]" />
        <div className="absolute -right-1.5 top-16 bottom-20 w-2 bg-[#121417] rounded-r-md border-r border-y border-[#2E3338]" />

        {/* Top Asymmetric Hood / Cable Junction Cowl */}
        <div className="flex justify-between items-center mb-2 px-1">
          {/* Status LEDs on Top-Left Shoulder */}
          <div className="flex items-center gap-2.5 bg-[#14171A] px-3 py-1 rounded-full border border-[#2B3036]">
            {/* RADIO LED */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)] animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-tighter">
                RAD
              </span>
            </div>
            {/* DECODE (GOOD SCAN) LED */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
                  decodeLed
                    ? "bg-emerald-400 shadow-[0_0_12px_#10B981]"
                    : "bg-emerald-950/60 border border-emerald-800/40"
                }`}
              />
              <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-tighter">
                DEC
              </span>
            </div>
            {/* ERROR LED */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
                  errorLed
                    ? "bg-red-500 shadow-[0_0_12px_#EF4444]"
                    : "bg-red-950/60 border border-red-800/40"
                }`}
              />
              <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-tighter">
                ERR
              </span>
            </div>
          </div>

          {/* Top Cowl with Cable Grommet Insignia */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
            <span>WT4090</span>
            <div className="w-3 h-3 rounded-full bg-[#101214] border border-zinc-600 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            </div>
          </div>
        </div>

        {/* ── RECESSED LCD SCREEN BEZEL & TRANSFLECTIVE GLASS ─────────────── */}
        <div className="bg-[#121518] p-2.5 rounded-xl border-2 border-[#101316] shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)] flex flex-col mb-2.5">
          {/* Transflective LCD Glass (QVGA 320x240 Ratio) */}
          <div
            className={`w-full rounded-lg p-3 font-mono transition-colors duration-200 shadow-inner flex flex-col justify-between ${
              backlightOn
                ? "bg-[#14181B] text-[#D6E2E8]"
                : "bg-[#0E1113] text-[#8E9AA0]"
            }`}
            style={{
              minHeight: "205px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            {/* Top LCD Status Header: 4-Bar Signal Icon + Mode + Step */}
            <div className="flex justify-between items-center border-b border-[#252C32] pb-1.5 mb-1.5 text-[12px] font-bold">
              {/* 4-Bar Wireless Signal Icon */}
              <div className="flex items-end gap-1" title="Wireless Signal: 100%">
                <span className="w-1 h-2 rounded-xs bg-[#10B981]" />
                <span className="w-1 h-2.5 rounded-xs bg-[#10B981]" />
                <span className="w-1 h-3.5 rounded-xs bg-[#10B981]" />
                <span className="w-1 h-4 rounded-xs bg-[#10B981]" />
                <span className="ml-1.5 text-[11px] text-emerald-400 font-bold">AP-316</span>
              </div>

              {/* Status Indicators: Shift / Ctrl */}
              <div className="flex items-center gap-1.5 text-[10px]">
                {shiftActive && (
                  <span className="px-1.5 bg-amber-500/30 text-amber-300 font-black rounded border border-amber-500/50">
                    SHF
                  </span>
                )}
                {ctrlActive && (
                  <span className="px-1.5 bg-cyan-500/30 text-cyan-300 font-black rounded border border-cyan-500/50">
                    CTL
                  </span>
                )}
                <span className="text-zinc-300 font-bold px-1.5 py-0.5 rounded bg-zinc-800/60">
                  {inputMode === "SCAN" ? "[SCAN]" : inputMode === "TYPE" ? "[KEY]" : "[CONFIRM]"}
                </span>
              </div>
            </div>

            {/* Strict 6-Line Telnet WMS Display Hierarchy */}
            <div className="flex-1 flex flex-col justify-center space-y-1 text-[14px] sm:text-[15px] leading-relaxed font-mono tracking-tight">
              {rfScreen.lines.map((line, idx) => {
                const label = line.label ?? ""
                const value = line.value ?? ""
                const isCursor = line.isCursorField

                return (
                  <div
                    key={idx}
                    className={`flex items-baseline justify-between overflow-hidden whitespace-pre py-0.5 px-1 rounded ${
                      line.isHighlighted
                        ? "bg-[#22303A] text-cyan-200"
                        : ""
                    }`}
                  >
                    <span className="text-[#94A3B8] font-bold shrink-0">
                      {label ? `${label}:` : ""}
                    </span>
                    <span className="font-black text-right truncate text-white">
                      {isCursor ? (
                        <>
                          <span className="text-amber-300 font-black">{inputValue}</span>
                          <span className="inline-block w-2.5 h-4 bg-emerald-400 align-middle ml-1 animate-pulse" />
                        </>
                      ) : (
                        <span className={line.isHighlighted ? "text-cyan-300" : "text-emerald-300"}>
                          {value}
                        </span>
                      )}
                    </span>
                  </div>
                )
              })}

              {/* Error or Notice line */}
              {inputError && (
                <div className="bg-red-950 text-red-200 text-xs font-bold px-2 py-0.5 rounded mt-1 text-center border border-red-800">
                  ! {inputError}
                </div>
              )}
            </div>

            {/* Bottom LCD Prompt Bar */}
            <div className="border-t border-[#252C32] pt-1.5 mt-1.5 flex justify-between text-[11px] text-zinc-300 font-bold">
              <button
                type="button"
                onClick={onHelpProtocol}
                className="pointer-events-auto cursor-pointer hover:text-white transition-colors uppercase font-bold text-cyan-400"
              >
                F1=HELP
              </button>
              <span className="text-zinc-400 font-mono">
                {session.cart.cartBarcode || "C000000083"}
              </span>
              <span className="text-emerald-400 font-bold">ENT=NEXT ↵</span>
            </div>
          </div>

          {/* Debossed Lowercase "symbol" Brand Insignia */}
          <div className="text-center mt-1.5">
            <span className="text-xs font-bold text-zinc-400 tracking-widest lowercase font-sans select-none drop-shadow-[0_1px_1px_rgba(255,255,255,0.08)]">
              symbol
            </span>
          </div>
        </div>

        {/* ── PHYSICAL CHICLET RUBBER KEYPAD CLUSTER ───────────────────────── */}
        <div className="flex gap-2 items-stretch">
          {/* Main 3x4 Alphanumeric Key Matrix */}
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            {/* ROW 1 */}
            <KeyButton
              num="1"
              alpha="AB"
              ctrl="CTRL_A"
              isHighlighted={isBeat3Prompt}
              onClick={() => handleKeyTap("1", "A", "CTRL_A")}
            />
            <KeyButton
              num="2"
              alpha="CD"
              ctrl="CTRL_D"
              onClick={() => handleKeyTap("2", "C", "CTRL_D")}
            />
            <KeyButton
              num="3"
              alpha="EF"
              ctrl="CTRL_E"
              onClick={() => handleKeyTap("3", "E", "CTRL_E")}
            />

            {/* ROW 2 */}
            <KeyButton
              num="4"
              alpha="GH"
              ctrl="CTRL_H"
              onClick={() => handleKeyTap("4", "G", "CTRL_H")}
            />
            <KeyButton
              num="5"
              alpha="IJ"
              ctrl="CTRL_I"
              onClick={() => handleKeyTap("5", "I", "CTRL_I")}
            />
            <KeyButton
              num="6"
              alpha="KL"
              ctrl="CTRL_K"
              onClick={() => handleKeyTap("6", "K", "CTRL_K")}
            />

            {/* ROW 3 */}
            <KeyButton
              num="7"
              alpha="MN"
              ctrl="CTRL_M"
              onClick={() => handleKeyTap("7", "M", "CTRL_M")}
            />
            <KeyButton
              num="8"
              alpha="OP"
              ctrl="CTRL_O"
              onClick={() => handleKeyTap("8", "O", "CTRL_O")}
            />
            <KeyButton
              num="9"
              alpha="QR"
              ctrl="CTRL_Q"
              onClick={() => handleKeyTap("9", "Q", "CTRL_Q")}
            />

            {/* ROW 4 */}
            <button
              type="button"
              onClick={handleBackspace}
              className="pointer-events-auto cursor-pointer h-12 bg-[#2C3136] hover:bg-[#383F46] active:translate-y-0.5 active:shadow-inner text-zinc-200 rounded-md border-t border-[#464D54] border-b-2 border-[#171A1D] flex flex-col items-center justify-center shadow-md transition-transform"
            >
              <span className="text-xs font-mono font-black text-red-400">
                BKSP
              </span>
              <span className="text-[9px] text-amber-400 font-mono font-bold">
                ST
              </span>
            </button>

            <KeyButton
              num="0"
              alpha="YZ"
              ctrl="CTRL_Z"
              onClick={() => handleKeyTap("0", "Y", "CTRL_Z")}
            />

            <button
              type="button"
              onClick={() => handleKeyTap(".", "W", "CTRL_W")}
              className="pointer-events-auto cursor-pointer h-12 bg-[#2C3136] hover:bg-[#383F46] active:translate-y-0.5 active:shadow-inner text-zinc-200 rounded-md border-t border-[#464D54] border-b-2 border-[#171A1D] flex flex-col items-center justify-center shadow-md transition-transform"
            >
              <span className="text-base font-mono font-black text-zinc-100 leading-none">.</span>
              <span className="text-[9px] text-amber-400 font-mono font-bold">
                WX
              </span>
            </button>
          </div>

          {/* Right Flange: Tall Curved Vertical ENTER ↵ Bar */}
          <div className="w-16 flex flex-col justify-between">
            {/* Side P1 & P2 Rocker Softkeys */}
            <div className="grid grid-cols-2 gap-1 mb-1.5">
              <button
                type="button"
                onClick={() => handleSoftKey("P1")}
                className="pointer-events-auto cursor-pointer h-7 bg-[#23272B] hover:bg-[#31363C] active:translate-y-0.5 text-[10px] font-mono font-bold text-zinc-300 rounded border border-[#3A4047] shadow-sm flex items-center justify-center"
              >
                P1
              </button>
              <button
                type="button"
                onClick={() => handleSoftKey("P2")}
                className="pointer-events-auto cursor-pointer h-7 bg-[#23272B] hover:bg-[#31363C] active:translate-y-0.5 text-[10px] font-mono font-bold text-zinc-300 rounded border border-[#3A4047] shadow-sm flex items-center justify-center"
              >
                P2
              </button>
            </div>

            {/* Tall Vertical ENTER Rubber Bar — Highly Visible Industrial Green */}
            <button
              type="button"
              onClick={handleEnterTap}
              className="pointer-events-auto cursor-pointer flex-1 bg-gradient-to-b from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:translate-y-0.5 active:shadow-inner text-white rounded-lg border-2 border-emerald-400 flex flex-col items-center justify-center shadow-lg transition-transform p-1"
            >
              <span className="text-sm font-mono font-black tracking-wider uppercase">
                ENTER
              </span>
              <span className="text-lg font-mono font-black">↵</span>
            </button>
          </div>
        </div>

        {/* ── BOTTOM NAVIGATION & CONTROL STRIP ────────────────────────────── */}
        <div className="grid grid-cols-6 gap-1 mt-2">
          {/* ESC (Tactile Gray) */}
          <button
            type="button"
            onClick={() => handleSoftKey("ESC")}
            className="pointer-events-auto cursor-pointer h-9 bg-[#373E45] hover:bg-[#434B54] active:translate-y-0.5 text-[10px] font-mono font-bold text-zinc-100 rounded border-t border-[#535D67] border-b border-[#1A1D20] shadow-sm flex items-center justify-center"
          >
            ESC
          </button>

          {/* Orange Backlight Key [☼] */}
          <button
            type="button"
            onClick={toggleBacklight}
            className="pointer-events-auto cursor-pointer h-9 bg-[#C25E00] hover:bg-[#D96B00] active:translate-y-0.5 text-sm font-black text-white rounded border-t border-[#FFA742] border-b border-[#7A3B00] shadow-sm flex items-center justify-center"
            title="Toggle Transflective Backlight"
          >
            ☼
          </button>

          {/* MENU / TAB */}
          <button
            type="button"
            onClick={() => handleSoftKey("TAB")}
            className="pointer-events-auto cursor-pointer h-9 bg-[#2C3136] hover:bg-[#383F46] active:translate-y-0.5 text-[10px] font-mono font-bold text-zinc-200 rounded border-t border-[#464D54] border-b border-[#171A1D] shadow-sm flex items-center justify-center"
          >
            TAB
          </button>

          {/* ALT / CTRL */}
          <button
            type="button"
            onClick={() => setCtrlActive((prev) => !prev)}
            className={`pointer-events-auto cursor-pointer h-9 active:translate-y-0.5 text-[10px] font-mono font-bold rounded border-t border-b shadow-sm flex items-center justify-center transition-colors ${
              ctrlActive
                ? "bg-cyan-600 text-white border-cyan-400"
                : "bg-[#2C3136] text-zinc-300 border-[#464D54]"
            }`}
          >
            CTRL
          </button>

          {/* SHIFT (ALPHA) */}
          <button
            type="button"
            onClick={() => setShiftActive((prev) => !prev)}
            className={`pointer-events-auto cursor-pointer h-9 active:translate-y-0.5 text-[10px] font-mono font-bold rounded border-t border-b shadow-sm flex items-center justify-center transition-colors ${
              shiftActive
                ? "bg-amber-600 text-white border-amber-400"
                : "bg-[#2C3136] text-zinc-300 border-[#464D54]"
            }`}
          >
            SHF
          </button>

          {/* Signature Cyan / Light Blue Pill Key */}
          <button
            type="button"
            onClick={() => handleSoftKey("BLUE_KEY")}
            className="pointer-events-auto cursor-pointer h-9 bg-[#0284C7] hover:bg-[#0369A1] active:translate-y-0.5 text-xs font-mono font-bold text-white rounded-full border-t border-[#38BDF8] border-b border-[#0C4A6E] shadow-sm flex items-center justify-center"
          >
            ●
          </button>
        </div>

        {/* ── COILED PU RING-SCANNER CABLE & TRIGGER BUTTON ────────────────── */}
        <div className="mt-3 pt-2.5 border-t border-[#2B3036] flex items-center justify-between">
          {/* Coiled Cord Visual */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-600 shadow-inner" />
            <div className="flex items-center space-x-0.5 text-zinc-500">
              <span className="text-xs">⌇⌇⌇⌇</span>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-tighter">
                RS5100 RING SCANNER
              </span>
            </div>
          </div>

          {/* Wearable Ring Scanner Trigger Button — Prominent & High Visibility */}
          <button
            type="button"
            onClick={handleTriggerClick}
            className="pointer-events-auto cursor-pointer h-10 px-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:translate-y-0.5 text-black font-mono text-xs font-black uppercase rounded-xl border-2 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center gap-2 transition-all"
            title="Pull Laser Scan Trigger"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
            <span>PULL TRIGGER</span>
          </button>
        </div>

        {/* Quick Softkey Overrides (Non-Destructive Exception Strip) */}
        <div className="mt-2.5 grid grid-cols-5 gap-1.5 text-[9px] font-mono">
          <button
            type="button"
            onClick={onHelpProtocol}
            className="pointer-events-auto cursor-pointer py-1 bg-blue-950/70 hover:bg-blue-900 border border-blue-600/70 text-blue-200 rounded font-bold"
            title="Open 4-Beat SOP Guide"
          >
            [?] SOP
          </button>
          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_K")}
            className="pointer-events-auto cursor-pointer py-1 bg-amber-950/50 hover:bg-amber-900 border border-amber-700/50 text-amber-200 rounded font-bold"
          >
            ^K SHORT
          </button>
          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_M")}
            className="pointer-events-auto cursor-pointer py-1 bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-700/50 text-cyan-200 rounded font-bold"
          >
            ^M MANUAL
          </button>
          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_D")}
            className="pointer-events-auto cursor-pointer py-1 bg-orange-950/50 hover:bg-orange-900 border border-orange-700/50 text-orange-200 rounded font-bold"
          >
            ^D DAMAGE
          </button>
          <button
            type="button"
            onClick={() => handleSoftKey("CTRL_H")}
            className="pointer-events-auto cursor-pointer py-1 bg-red-950/50 hover:bg-red-900 border border-red-700/50 text-red-200 rounded font-bold"
          >
            ^H HAZMAT
          </button>
        </div>
      </div>
    </div>
  )
}

/** Individual Rubber Chiclet Button with secondary orange stamped alpha label */
function KeyButton({
  num,
  alpha,
  ctrl,
  onClick,
  isHighlighted = false,
}: {
  num: string
  alpha: string
  ctrl: string
  onClick: () => void
  isHighlighted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto cursor-pointer h-12 active:translate-y-0.5 active:shadow-inner text-zinc-100 rounded-md border-t border-b-2 flex flex-col items-center justify-center shadow-md transition-all ${
        isHighlighted
          ? "bg-[#422C0A] border-amber-400 border-t-amber-300 ring-2 ring-amber-400 shadow-[0_0_12px_#F59E0B] animate-pulse"
          : "bg-[#2C3136] hover:bg-[#383F46] border-t-[#464D54] border-b-[#171A1D]"
      }`}
    >
      <span className="text-base font-mono font-black text-zinc-100 leading-none">
        {num}
      </span>
      <span className="text-[10px] font-mono font-bold text-amber-400 tracking-tighter leading-none mt-0.5">
        {alpha}
      </span>
    </button>
  )
}
