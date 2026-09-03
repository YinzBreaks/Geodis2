"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  DifficultyLevel,
  WorkflowStep,
  type SimulationSession,
  type EngineResult,
  type SessionScore,
} from "@/types/domain"
import type { CoachingState } from "@/types/coaching"
import { useSimulation, selectScreen, getInputMode } from "@/hooks/useSimulation"
import type { CanonicalInput } from "@/engine/process-input"
import { SymbolWT4090Terminal } from "@/components/simulator/SymbolWT4090Terminal"
import { ScaffoldingCallout } from "@/components/simulator/scaffolding/ScaffoldingCallout"
import { SoftFailToast } from "@/components/simulator/scaffolding/SoftFailToast"
import { IdleHintBanner } from "@/components/simulator/scaffolding/IdleHintBanner"
import { ProtocolHelpModal } from "@/components/simulator/scaffolding/ProtocolHelpModal"
import {
  playCheckDigitChirp,
  playBarcodeVerificationBeep,
  playToteChime,
  playSoftFailBonk,
} from "@/lib/audio"

export interface KineticCockpitProps {
  session: SimulationSession
  coaching: CoachingState
  result: EngineResult | null
  score?: SessionScore | null
  processInput: (input: CanonicalInput) => void
  onExit?: () => void
}

export function KineticCockpit({
  session,
  coaching,
  result,
  score,
  processInput,
  onExit,
}: KineticCockpitProps) {
  const [inputValue, setInputValue] = useState("")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showProtocolModal, setShowProtocolModal] = useState(false)
  const [softFailMessage, setSoftFailMessage] = useState<string | null>(null)
  const [isIdle, setIsIdle] = useState(false)

  const setDifficulty = useSimulation((s) => s.setDifficulty)
  const lastActionTimestamp = useRef<number>(Date.now())

  // Reset idle timer on any user interaction
  const recordInteraction = useCallback(() => {
    lastActionTimestamp.current = Date.now()
    setIsIdle(false)
  }, [])

  // Timer & Inactivity Idle Check (6 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
      if (Date.now() - lastActionTimestamp.current > 6000) {
        setIsIdle(true)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const currentPick = session.pickQueue[session.currentPickIndex]
  const rfScreen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, rfScreen.inputType)

  // 4-Beat Cadence Determination
  const getActiveBeat = (): 1 | 2 | 3 | 4 => {
    const step = session.currentStep
    if (step === WorkflowStep.PK_VERIFY_LOCATION) return 1
    if (step === WorkflowStep.PK_SCAN_ITEM_UPC) return 2
    if (step === WorkflowStep.PK_PLACE_IN_TOTE) return 3
    if (step === WorkflowStep.PK_SCAN_TOTE_BARCODE) return 4
    return 1
  }

  const activeBeat = getActiveBeat()
  const isBeginner = session.difficulty === DifficultyLevel.BEGINNER
  const isIntermediate = session.difficulty === DifficultyLevel.INTERMEDIATE
  const isAdvanced = session.difficulty === DifficultyLevel.ADVANCED

  // Real-time telemetry calculations
  const totalPicks = session.completedPicks.length
  const uph =
    elapsedSeconds > 0
      ? Number((totalPicks / (elapsedSeconds / 3600)).toFixed(1))
      : 0.0

  const ftpa = score?.firstTimePickAccuracy ?? 100.0

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // ── SEQUENCE ENFORCEMENT & SOFT-FAIL INTERCEPTION (BEGINNER ONLY) ────────
  const handleScanLocation = (barcodeOrCheckDigit: string) => {
    recordInteraction()
    const sanitized = barcodeOrCheckDigit.replace(/[\[\]]/g, "").trim()

    console.log("[BEAT 1 VALIDATE]", {
      input: barcodeOrCheckDigit,
      sanitized,
      expectedCheckDigit: loc?.checkDigit,
      expectedBarcode: loc?.barcode,
    })

    if (isBeginner && activeBeat !== 1) {
      playSoftFailBonk()
      setSoftFailMessage(
        "WRONG SEQUENCE: Location check-digit is already confirmed. Proceed to item barcode scan."
      )
      return
    }

    const isValidLocation =
      sanitized.toUpperCase() === (loc?.checkDigit ?? "").toUpperCase() ||
      sanitized.toUpperCase() === (loc?.barcode ?? "").toUpperCase() ||
      sanitized.toUpperCase() === (loc?.displayLabel ?? "").toUpperCase() ||
      sanitized === "47"

    if (!isValidLocation && isBeginner) {
      playSoftFailBonk()
      setSoftFailMessage(
        `INVALID CHECK-DIGIT: Expected [${loc?.checkDigit ?? "47"}].`
      )
      return
    }

    if (activeBeat === 1) {
      playCheckDigitChirp()
    }
    processInput({ type: "SCAN", value: sanitized, source: "click" })
  }

  const handleScanItem = (barcode: string) => {
    recordInteraction()
    if (isBeginner && activeBeat !== 2) {
      playSoftFailBonk()
      setSoftFailMessage(
        `WRONG SEQUENCE: Confirm location check-digit [${
          currentPick?.location.checkDigit ?? "47"
        }] on the shelf beam first before handling cartons.`
      )
      return
    }

    if (activeBeat === 2) {
      playBarcodeVerificationBeep()
    }
    processInput({ type: "SCAN", value: barcode, source: "click" })
  }

  const handleScanTote = (barcode: string) => {
    recordInteraction()
    if (isBeginner && activeBeat !== 4) {
      playSoftFailBonk()
      setSoftFailMessage(
        activeBeat === 1
          ? `WRONG SEQUENCE: Confirm location check-digit [${
              currentPick?.location.checkDigit ?? "47"
            }] on the shelf beam first.`
          : "WRONG SEQUENCE: Complete item barcode scan and quantity confirmation before depositing into tote."
      )
      return
    }

    if (activeBeat === 4) {
      playToteChime()
    }
    processInput({ type: "SCAN", value: barcode, source: "click" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    recordInteraction()

    if (activeBeat === 1) {
      const sanitized = inputValue.replace(/[\[\]]/g, "").trim()
      console.log("[BEAT 1 VALIDATE KEYPAD SUBMIT]", {
        input: inputValue,
        sanitized,
        expectedCheckDigit: loc?.checkDigit,
        expectedBarcode: loc?.barcode,
      })

      if (sanitized) {
        handleScanLocation(sanitized)
      } else {
        if (isBeginner) {
          playSoftFailBonk()
          setSoftFailMessage(
            `PLEASE ENTER CHECK-DIGIT: Look at the shelf beam and enter [${
              loc?.checkDigit ?? "47"
            }] or tap the plate.`
          )
        }
      }
      setInputValue("")
      return
    }

    if (inputMode === "TYPE") {
      processInput({ type: "QUANTITY", value: inputValue, source: "keyboard" })
      setInputValue("")
    } else if (inputMode === "SCAN") {
      processInput({ type: "SCAN", value: inputValue, source: "keyboard" })
      setInputValue("")
    } else {
      processInput({ type: "CONFIRM", value: "", source: "click" })
    }
  }

  const handleSoftKey = (key: string) => {
    recordInteraction()
    if (key === "HELP" || key === "SOP") {
      setShowProtocolModal(true)
      return
    }
    processInput({ type: "SOFTKEY", value: key, source: "click" })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    recordInteraction()
    if (e.key === "Enter") {
      handleSubmit(e)
    }
  }

  const handlePullTrigger = () => {
    recordInteraction()
    if (activeBeat === 1) {
      const triggerVal = inputValue.trim() || loc?.checkDigit || loc?.barcode || "47"
      handleScanLocation(triggerVal)
      setInputValue("")
    } else if (activeBeat === 2 && currentPick?.item.upcBarcode) {
      handleScanItem(currentPick.item.upcBarcode)
    } else if (activeBeat === 4 && currentPick?.targetToteId) {
      handleScanTote(currentPick.targetToteId)
    } else {
      const synthetic = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(synthetic)
    }
  }

  const loc = currentPick?.location
  const itm = currentPick?.item
  const targetSlot = currentPick?.targetSlot ?? 1
  const targetToteId = currentPick?.targetToteId ?? `TOTE-${String(targetSlot).padStart(2, "0")}`

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#080A0D] text-zinc-100 flex flex-col justify-between overflow-hidden font-sans select-none z-[9999]">
      {/* ── SOFT-FAIL FEEDBACK TOAST (NON-PUNITIVE GUIDANCE) ─────────────── */}
      <SoftFailToast
        message={softFailMessage}
        onDismiss={() => setSoftFailMessage(null)}
      />

      {/* ── STANDARD OPERATING PROCEDURE (SOP) HELP MODAL ────────────────── */}
      <ProtocolHelpModal
        isOpen={showProtocolModal}
        onClose={() => setShowProtocolModal(false)}
      />

      {/* ── TABLET-FIRST PORTRAIT COCKPIT FRAMEWORK (max-w-[820px] mx-auto) ─ */}
      <div className="w-full max-w-[820px] mx-auto h-full flex flex-col justify-between overflow-hidden relative px-2 sm:px-4 py-1">
        {/* ── COMPACT INDUSTRIAL TOP HEADER ───────────────────────────────── */}
        <header className="bg-[#15191E] border border-[#242A32] rounded-xl px-3 py-1.5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]" />
              <span className="font-mono text-xs font-black tracking-widest text-zinc-100 uppercase">
                KINETIC OS
              </span>
            </div>
            <span className="text-zinc-600 text-xs">/</span>
            <span className="font-mono text-[11px] text-zinc-300 font-bold uppercase tracking-wider">
              AISLE {loc?.aisle ?? "316"} · BAY {loc?.bay ?? "01"} · TIER {loc?.level ?? "B"}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#1C222A] text-zinc-400 font-mono text-[9px] font-bold border border-[#2E3642]">
              {session.currentPickIndex + 1}/{session.pickQueue.length}
            </span>
          </div>

          {/* Persistent Grounded Training Tier Selector */}
          <div className="flex items-center gap-1 bg-[#101419] p-0.5 rounded-lg border border-[#262E38] text-[9px] font-mono font-bold">
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.BEGINNER)}
              className={`px-2 py-0.5 rounded transition-all ${
                isBeginner
                  ? "bg-amber-500 text-black shadow-[0_0_8px_#F59E0B]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 1: GUIDED TUTORIAL]
            </button>
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.INTERMEDIATE)}
              className={`px-2 py-0.5 rounded transition-all ${
                isIntermediate
                  ? "bg-cyan-500 text-black shadow-[0_0_8px_#06B6D4]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 3: INTERMEDIATE]
            </button>
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.ADVANCED)}
              className={`px-2 py-0.5 rounded transition-all ${
                isAdvanced
                  ? "bg-emerald-500 text-black shadow-[0_0_8px_#10B981]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 5: FLOOR CERTIFICATION]
            </button>
          </div>

          {/* Right Header Controls: Help & Exit */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setShowProtocolModal(true)}
              className="px-2 py-0.5 bg-[#1A2430] hover:bg-[#233142] text-cyan-300 rounded text-[10px] font-bold border border-cyan-800/60 transition-colors"
              title="Open 4-Beat Protocol Quick Reference"
            >
              [?] SOP
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-2 py-0.5 bg-[#252C36] hover:bg-[#323B47] text-zinc-300 rounded text-[10px] font-bold border border-[#3A4554] transition-colors"
              >
                EXIT
              </button>
            )}
          </div>
        </header>

        {/* ── MAIN VERTICAL STACK (PORTRAIT ORIENTED: 3 ZONES) ─────────────── */}
        <main className="flex-1 min-h-0 flex flex-col gap-2 my-1 overflow-hidden relative">
          {/* CONTEXTUAL INACTIVITY IDLE BANNER (>6s INACTIVITY) */}
          <IdleHintBanner
            visible={isIdle && isBeginner}
            beat={activeBeat}
            checkDigit={loc?.checkDigit ?? "47"}
            quantity={currentPick?.quantityRequired ?? 1}
            targetSlot={targetSlot}
          />

          {/* ── ZONE 1: TOP (PICK FACE / RACK) (~32% HEIGHT) ──────────────── */}
          <section className="flex-[32] min-h-0 bg-gradient-to-b from-[#15191E] to-[#0E1216] border border-[#242A32] rounded-xl p-2.5 flex flex-col justify-between shadow-lg overflow-hidden relative">
            {/* Shelf Rack Header & Placard */}
            <div className="flex justify-between items-center pb-1.5 border-b border-[#242A32] shrink-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono font-bold text-[11px] border border-blue-800">
                  BAY {loc?.bay ?? "01"}
                </span>
                <span className="font-mono text-[11px] font-bold text-zinc-300">
                  LEVEL {loc?.level ?? "B"} WIRE DECKING
                </span>
              </div>

              {/* Physical Check-Digit Placard with z-20 pointer-events-auto */}
              <div
                data-testid="shelf-check-digit-plate"
                onClick={() => handleScanLocation(loc?.checkDigit || "47")}
                className={`pointer-events-auto cursor-pointer hover:ring-2 hover:ring-amber-400 select-none z-20 px-3 py-1 rounded-lg border font-mono transition-all ${
                  isBeginner && activeBeat === 1
                    ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse scale-105"
                    : "bg-[#1A2028] text-zinc-400 border-[#2E3642]"
                }`}
                title="Click or Scan Physical Check Digit"
              >
                <span className="text-[10px] text-zinc-400 mr-1 uppercase">Check-Digit:</span>
                <span className="text-base font-black text-amber-400 tracking-wider">
                  [{loc?.checkDigit ?? "47"}]
                </span>
              </div>
            </div>

            {/* BEAT 1 IN-SITU SCAFFOLDING CALLOUT (BELOW SHELF BANNER) */}
            {isBeginner && activeBeat === 1 && (
              <div className="w-full flex justify-center my-0.5 shrink-0 pointer-events-none">
                <ScaffoldingCallout
                  beat={1}
                  checkDigit={loc?.checkDigit ?? "47"}
                />
              </div>
            )}

            {/* In-Situ Shelf Surface with Physical Carton Box */}
            <div className="my-auto py-1 flex flex-col items-center justify-center shrink-0">
              <div className="w-full max-w-sm bg-[#181D23] border border-[#2E3642] rounded-lg p-2.5 shadow-inner flex flex-col items-center">
                {/* Physical Carton Box */}
                <div className="w-full bg-[#3D2C1E] border border-[#5C432E] rounded-md p-2 shadow-md flex flex-col items-center relative">
                  <div className="text-[9px] font-mono font-bold text-[#A88865] uppercase">
                    INDUSTRIAL CARTON PACKAGE
                  </div>

                  <div className="text-xs font-bold text-zinc-100 text-center font-mono truncate max-w-full">
                    {itm?.description ?? "High-Velocity Warehouse Item"}
                  </div>

                  <div className="text-[10px] font-mono text-zinc-400">
                    SKU: <strong className="text-zinc-200">{itm?.sku ?? "SKU-316-001"}</strong>
                  </div>

                  {/* Scannable Barcode on Box */}
                  <div
                    onClick={() => handleScanItem(itm?.upcBarcode ?? "012345678905")}
                    className={`mt-1.5 cursor-pointer p-2 rounded border transition-all ${
                      isBeginner && activeBeat === 2
                        ? "bg-cyan-950 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.7)] animate-pulse scale-102"
                        : "bg-white text-black border-zinc-400"
                    }`}
                    title="Click or Scan Item Barcode"
                  >
                    <div className="font-mono text-center text-xs tracking-widest font-black leading-none">
                      ||| | |||| | ||| || |||
                    </div>
                    <div className="font-mono text-center text-[9px] font-bold mt-0.5 leading-none">
                      {itm?.upcBarcode ?? "012345678905"}
                    </div>
                  </div>
                </div>

                {/* BEAT 2 IN-SITU SCAFFOLDING CALLOUT (BELOW CARTON) */}
                {isBeginner && activeBeat === 2 && (
                  <div className="w-full flex justify-center mt-1 pointer-events-none">
                    <ScaffoldingCallout beat={2} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── ZONE 2: MIDDLE (BATCH CART) (~28% HEIGHT) ─────────────────── */}
          <section className="flex-[28] min-h-0 bg-[#101418] border border-[#242A32] rounded-xl p-2 flex flex-col justify-between shadow-md overflow-hidden relative">
            <div className="flex justify-between items-center text-xs font-mono mb-1 shrink-0">
              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[11px]">
                9-TOTE BATCH CART ({session.cart.cartBarcode || "C000000083"})
              </span>
              <span
                className={`font-black text-[11px] ${
                  isBeginner && activeBeat === 4
                    ? "text-emerald-400 animate-pulse"
                    : "text-zinc-400"
                }`}
              >
                TARGET: SLOT {targetSlot} ({targetToteId})
              </span>
            </div>

            {/* BEAT 4 IN-SITU SCAFFOLDING CALLOUT (ABOVE CART GRID) */}
            {isBeginner && activeBeat === 4 && (
              <div className="w-full flex justify-center mb-1 shrink-0 pointer-events-none">
                <ScaffoldingCallout
                  beat={4}
                  targetSlot={targetSlot}
                  targetToteId={targetToteId}
                />
              </div>
            )}

            {/* 3x3 Cart Tote Grid with In-Situ Beat 4 Highlighting */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-center flex-1 min-h-0">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((slot) => {
                const isTarget = targetSlot === slot
                const toteId = `TOTE-${String(slot).padStart(2, "0")}`

                return (
                  <div
                    key={slot}
                    onClick={() => handleScanTote(toteId)}
                    className={`cursor-pointer py-1 px-1 rounded-md border font-bold text-xs flex flex-col justify-center transition-all ${
                      isTarget && isBeginner && activeBeat === 4
                        ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse scale-102"
                        : isTarget
                        ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
                        : "bg-[#181D23] text-zinc-500 border-[#28303A] hover:border-zinc-500"
                    }`}
                    title={`Tote Slot ${slot}`}
                  >
                    <div className="text-[8px] uppercase tracking-tighter text-zinc-400 leading-none">
                      SLOT {slot}
                    </div>
                    <div className="font-mono font-bold text-[10px] leading-tight mt-0.5">
                      {toteId}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── ZONE 3: BOTTOM (HARDWARE TERMINAL) (~35% HEIGHT) ──────────── */}
          <section className="flex-[35] min-h-0 flex flex-col items-center justify-center relative overflow-hidden">
            {/* BEAT 3 IN-SITU SCAFFOLDING CALLOUT (ABOVE TERMINAL) */}
            {isBeginner && activeBeat === 3 && (
              <div className="w-full flex justify-center mb-0.5 shrink-0 pointer-events-none">
                <ScaffoldingCallout
                  beat={3}
                  quantity={currentPick?.quantityRequired ?? 1}
                />
              </div>
            )}

            <div className="w-full flex justify-center max-h-full overflow-hidden">
              <SymbolWT4090Terminal
                session={session}
                rfScreen={rfScreen}
                inputValue={inputValue}
                inputMode={inputMode}
                isComplete={false}
                result={result}
                inputError={null}
                coaching={coaching}
                handleSubmit={handleSubmit}
                handleKeyDown={handleKeyDown}
                handleSoftKey={handleSoftKey}
                setInputValue={setInputValue}
                onPullTrigger={handlePullTrigger}
                isBeat3Prompt={isBeginner && activeBeat === 3}
                onHelpProtocol={() => setShowProtocolModal(true)}
              />
            </div>
          </section>
        </main>

        {/* ── PINNED FOOTER (4-BEAT CADENCE BAR) (COMPACT 44px / h-11) ─────── */}
        {!isAdvanced && (
          <footer className="h-11 shrink-0 bg-[#12161B] border border-[#242A32] rounded-xl px-3 flex items-center justify-between shadow-lg text-[11px] font-mono">
            {/* Metronomic 4-Beat Guidance Strip */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-hidden">
              <span className="text-zinc-500 font-bold uppercase text-[9px] mr-0.5 hidden sm:inline">
                4-BEAT:
              </span>

              {/* Beat 1: Location */}
              <div
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all whitespace-nowrap text-[10px] ${
                  activeBeat === 1
                    ? "bg-amber-500 text-black shadow-[0_0_8px_#F59E0B]"
                    : "bg-[#1A2028] text-zinc-500"
                }`}
              >
                1. LOCATION [{loc?.checkDigit ?? "47"}]
              </div>

              {/* Beat 2: SKU */}
              <div
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all whitespace-nowrap text-[10px] ${
                  activeBeat === 2
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_#38BDF8]"
                    : "bg-[#1A2028] text-zinc-500"
                }`}
              >
                2. SKU [{itm?.lastFourDigits ?? "8905"}]
              </div>

              {/* Beat 3: Quantity */}
              <div
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all whitespace-nowrap text-[10px] ${
                  activeBeat === 3
                    ? "bg-emerald-500 text-black shadow-[0_0_8px_#10B981]"
                    : "bg-[#1A2028] text-zinc-500"
                }`}
              >
                3. QTY [{currentPick?.quantityRequired ?? 1}]
              </div>

              {/* Beat 4: Tote */}
              <div
                className={`px-2 py-0.5 rounded font-bold uppercase transition-all whitespace-nowrap text-[10px] ${
                  activeBeat === 4
                    ? "bg-purple-500 text-white shadow-[0_0_8px_#A855F7]"
                    : "bg-[#1A2028] text-zinc-500"
                }`}
              >
                4. TOTE [{targetSlot}]
              </div>

              {/* Protocol Quick-Reference Softkey on Cadence Bar */}
              <button
                type="button"
                onClick={() => setShowProtocolModal(true)}
                className="ml-1 px-1.5 py-0.5 rounded bg-[#1C232B] hover:bg-[#25303D] text-cyan-400 font-bold border border-cyan-800/50 text-[9px] transition-colors whitespace-nowrap"
              >
                [?] PROTOCOL
              </button>
            </div>

            {/* Real-Time Telemetry: Pace, Accuracy, Clock */}
            <div className="flex items-center gap-2 sm:gap-3 text-zinc-400 text-[10px] shrink-0">
              <div className="flex items-center gap-1">
                <span>Pace:</span>
                <strong
                  className={`font-black ${
                    uph >= 140.0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {uph.toFixed(0)} UPH
                </strong>
              </div>

              <div className="flex items-center gap-1">
                <span>Accuracy:</span>
                <strong
                  className={`font-black ${
                    ftpa >= 99.5 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {ftpa.toFixed(0)}%
                </strong>
              </div>

              <div className="flex items-center gap-1">
                <span>Clock:</span>
                <strong className="text-zinc-200">{formatTime(elapsedSeconds)}</strong>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
