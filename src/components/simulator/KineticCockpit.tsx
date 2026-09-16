"use client"

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react"
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
import { getProductAsset, ENVIRONMENT_PLATES } from "@/lib/assetRegistry"
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

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE FIT-TO-ZONE SCALER (Guards against overflow on small laptop viewports)
// ─────────────────────────────────────────────────────────────────────────────

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

interface FitBox {
  scale: number
  width: number
  height: number
}

function useFitScale() {
  const hostRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<FitBox | null>(null)

  useIsoLayoutEffect(() => {
    const host = hostRef.current
    const content = contentRef.current
    if (!host || !content) return

    const measure = () => {
      const hostW = host.clientWidth
      const hostH = host.clientHeight
      const natW = content.offsetWidth
      const natH = content.offsetHeight

      if (!hostW || !hostH || !natW || !natH) {
        setFit(null)
        return
      }

      // On desktop heights (> 750px), terminal stays at 100% full scale
      const scale = Math.min(1, hostW / natW, hostH / natH)
      const next: FitBox = { scale, width: natW * scale, height: natH * scale }
      setFit((prev) =>
        prev &&
        prev.scale === next.scale &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next
      )
    }

    measure()
    const raf = requestAnimationFrame(measure)

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener("resize", measure)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(host)
    observer.observe(content)
    window.addEventListener("resize", measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", measure)
      observer.disconnect()
    }
  }, [])

  useIsoLayoutEffect(() => {
    if (!fit) return
    const host = hostRef.current
    const content = contentRef.current
    if (!host || !content) return

    const hostW = host.clientWidth
    const hostH = host.clientHeight
    const natW = content.offsetWidth
    const natH = content.offsetHeight
    if (!hostW || !hostH || !natW || !natH) return

    const scale = Math.min(1, hostW / natW, hostH / natH)
    if (Math.abs(scale - fit.scale) > 0.005) {
      setFit({ scale, width: natW * scale, height: natH * scale })
    }
  })

  return { hostRef, contentRef, fit }
}

function slotColumn(slot: number): 1 | 2 | 3 {
  return (((slot - 1) % 3) + 1) as 1 | 2 | 3
}

// ─────────────────────────────────────────────────────────────────────────────
// KINETIC COCKPIT — HIGH-FIDELITY WIDESCREEN WORKFORCE VELOCITY SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────

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
  const {
    hostRef: terminalHostRef,
    contentRef: terminalContentRef,
    fit: terminalFit,
  } = useFitScale()

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
  const loc = currentPick?.location
  const itm = currentPick?.item
  const targetSlot = currentPick?.targetSlot ?? 1
  const targetToteId =
    currentPick?.targetToteId ?? `TOTE-${String(targetSlot).padStart(2, "0")}`
  const rfScreen = selectScreen(session)
  const inputMode = getInputMode(session.currentStep, rfScreen.inputType)

  // 4-Beat Cadence Determination — maps all picking workflow steps to the 4 beats
  const getActiveBeat = (): 1 | 2 | 3 | 4 => {
    const step = session.currentStep
    if (
      step === WorkflowStep.PK_VERIFY_LOCATION ||
      step === WorkflowStep.PK_READ_PICK_DISPLAY ||
      step === WorkflowStep.PK_TRAVEL_TO_LOCATION
    ) {
      return 1
    }
    if (
      step === WorkflowStep.PK_SCAN_ITEM_UPC ||
      step === WorkflowStep.PK_VERIFY_ITEM
    ) {
      return 2
    }
    if (
      step === WorkflowStep.PK_ENTER_QUANTITY ||
      step === WorkflowStep.PK_PICK_QUANTITY ||
      step === WorkflowStep.PK_PLACE_IN_TOTE
    ) {
      return 3
    }
    if (
      step === WorkflowStep.PK_SCAN_TOTE_BARCODE ||
      step === WorkflowStep.PK_END_OF_TOTE_DISPLAY ||
      step === WorkflowStep.PK_PRESS_CTRL_A ||
      step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR ||
      step === WorkflowStep.PS_CONTINUE_NEXT_TOTE
    ) {
      return 4
    }
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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // ── DEADLOCK SAFEGUARD: FAST-FORWARD BC_ STEPS IF ENTERED INTO PICKING COCKPIT ──
  useEffect(() => {
    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
    }
  }, [session.currentStep, processInput])

  // ── SEQUENCE ENFORCEMENT & SOFT-FAIL INTERCEPTION ─────────────────────────
  const handleScanLocation = (barcodeOrCheckDigit: string) => {
    recordInteraction()
    const sanitized = barcodeOrCheckDigit.replace(/[\[\]]/g, "").trim()

    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
      return
    }

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
      sanitized === "47" ||
      sanitized === "18"

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
    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
      return
    }

    if (isBeginner && activeBeat !== 2) {
      playSoftFailBonk()
      setSoftFailMessage(
        `WRONG SEQUENCE: Confirm location check-digit [${
          loc?.checkDigit ?? "47"
        }] on the shelf beam first before handling cartons.`
      )
      return
    }

    if (activeBeat === 2) {
      playBarcodeVerificationBeep()
    }
    processInput({ type: "SCAN", value: barcode, source: "click" })
  }

  const handleScanTote = (barcodeOrToteId: string) => {
    recordInteraction()
    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
      return
    }

    if (isBeginner && activeBeat !== 4) {
      playSoftFailBonk()
      setSoftFailMessage(
        activeBeat === 1
          ? `WRONG SEQUENCE: Confirm location check-digit [${
              loc?.checkDigit ?? "47"
            }] on the shelf beam first.`
          : "WRONG SEQUENCE: Complete item barcode scan and quantity confirmation before depositing into tote."
      )
      return
    }

    if (activeBeat === 4) {
      playToteChime()
    }
    processInput({ type: "SCAN", value: barcodeOrToteId, source: "click" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    recordInteraction()

    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
      return
    }

    if (activeBeat === 1) {
      const sanitized = inputValue.replace(/[\[\]]/g, "").trim()
      handleScanLocation(sanitized || loc?.checkDigit || "47")
      setInputValue("")
      return
    }

    if (activeBeat === 2) {
      const upc = itm?.upcBarcode ?? "024505572001"
      handleScanItem(upc)
      setInputValue("")
      return
    }

    if (activeBeat === 3 || inputMode === "TYPE") {
      processInput({ type: "QUANTITY", value: inputValue || String(currentPick?.quantityRequired ?? 1), source: "keyboard" })
      setInputValue("")
      return
    }

    if (activeBeat === 4) {
      const targetTote = session.cart.totes.find((t) => t.slot === targetSlot)
      handleScanTote(targetTote?.barcode || targetToteId)
      setInputValue("")
      return
    }

    if (inputMode === "SCAN") {
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
    if (session.currentStep.startsWith("BC_")) {
      processInput({ type: "CONFIRM", value: "", source: "click" })
      return
    }

    if (activeBeat === 1) {
      const triggerVal =
        inputValue.trim() || loc?.checkDigit || loc?.barcode || "47"
      handleScanLocation(triggerVal)
      setInputValue("")
    } else if (activeBeat === 2 && currentPick?.item.upcBarcode) {
      handleScanItem(currentPick.item.upcBarcode)
    } else if (activeBeat === 3) {
      processInput({ type: "QUANTITY", value: inputValue || String(currentPick?.quantityRequired ?? 1), source: "keyboard" })
      setInputValue("")
    } else if (activeBeat === 4) {
      const targetTote = session.cart.totes.find((t) => t.slot === targetSlot)
      handleScanTote(targetTote?.barcode || targetToteId)
    } else {
      const synthetic = { preventDefault: () => {} } as React.FormEvent
      handleSubmit(synthetic)
    }
  }

  const beat4DockColumn = slotColumn(targetSlot)
  const productImg = itm ? getProductAsset(itm.sku || itm.itemId) : "/assets/products/item_widget_alpha_photoreal.png"

  return (
    <div className="fixed inset-0 bg-[#080A0D] text-zinc-100 font-sans overflow-hidden z-[9999]">
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

      {/* ── WIDESCREEN INDUSTRIAL COCKPIT (Up to 1600px desktop display) ──── */}
      <div className="w-full max-w-[1600px] mx-auto h-screen max-h-screen overflow-hidden flex flex-col justify-between p-2.5 sm:p-3 select-none">
        {/* ── TOP INDUSTRIAL TELEMETRY & TIER SELECTOR HEADER ─────────────── */}
        <header className="bg-[#15191E] border border-[#28303A] rounded-xl px-4 py-2 flex items-center justify-between gap-3 shrink-0 overflow-hidden shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10B981] animate-pulse" />
              <span className="font-mono text-sm font-black tracking-wider text-white uppercase">
                KINETIC OS
              </span>
            </div>
            <span className="text-zinc-600 text-sm font-bold">/</span>
            <span className="font-mono text-xs sm:text-sm text-zinc-200 font-bold uppercase tracking-wider truncate">
              AISLE {loc?.aisle ?? "316"} · BAY {loc?.bay ?? "01"} · TIER {loc?.level ?? "B"}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#1C222A] text-amber-300 font-mono text-xs font-black border border-[#374151] shrink-0">
              {session.currentPickIndex + 1}/{session.pickQueue.length}
            </span>
          </div>

          {/* Training Tier Selector */}
          <div className="flex items-center gap-1.5 bg-[#0F1317] p-1 rounded-lg border border-[#28303A] text-xs font-mono font-bold shrink-0">
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.BEGINNER)}
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded transition-all ${
                isBeginner
                  ? "bg-amber-500 text-black font-black shadow-[0_0_12px_#F59E0B]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 1: GUIDED TUTORIAL]
            </button>
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.INTERMEDIATE)}
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded transition-all ${
                isIntermediate
                  ? "bg-cyan-500 text-black font-black shadow-[0_0_12px_#06B6D4]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 3: INTERMEDIATE]
            </button>
            <button
              type="button"
              onClick={() => setDifficulty(DifficultyLevel.ADVANCED)}
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded transition-all ${
                isAdvanced
                  ? "bg-emerald-500 text-black font-black shadow-[0_0_12px_#10B981]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              [DAY 5: FLOOR CERTIFICATION]
            </button>
          </div>

          {/* Right Header Controls: SOP & Exit */}
          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => setShowProtocolModal(true)}
              className="pointer-events-auto cursor-pointer px-3 py-1 bg-[#1A2533] hover:bg-[#223347] text-cyan-300 rounded-md text-xs font-black border border-cyan-700/60 shadow-sm transition-colors"
              title="Open 4-Beat Protocol Reference"
            >
              [?] SOP
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="pointer-events-auto cursor-pointer px-3 py-1 bg-[#252C36] hover:bg-[#343D4B] text-zinc-200 rounded-md text-xs font-black border border-[#3A4554] transition-colors"
              >
                EXIT
              </button>
            )}
          </div>
        </header>

        {/* ── MAIN WORKSPACE: WIDE DUAL-COLUMN LAYOUT (DESKTOP) ─────────────── */}
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 my-2 overflow-hidden">
          {/* ════════ LEFT AREA: ENVIRONMENT, PICK FACE & BATCH CART (62%) ═══ */}
          <div className="flex-1 lg:flex-[62] min-h-0 flex flex-col gap-2.5 overflow-hidden">
            {/* ── ZONE 1: PICK FACE / RACK BEAM & PHOTOREALISTIC ITEM ──────── */}
            <section
              className="flex-[54] min-h-0 relative border-2 border-[#2B3542] rounded-2xl p-3 flex flex-col shadow-2xl overflow-hidden bg-gradient-to-b from-[#14181D] via-[#0E1216] to-[#080B0E]"
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(14, 18, 24, 0.88), rgba(8, 11, 14, 0.94)), url(${ENVIRONMENT_PLATES.rackPickFace})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Frazier Orange Safety Rack Beam Header */}
              <div className="bg-[#1C232C]/90 backdrop-blur-sm border-b-2 border-orange-500/80 rounded-xl px-3.5 py-2 flex justify-between items-center gap-3 shrink-0 shadow-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2.5 py-1 rounded bg-blue-950/90 text-blue-300 font-mono font-black text-xs border border-blue-600 shrink-0">
                    BAY {loc?.bay ?? "01"}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-zinc-100 uppercase tracking-wider truncate">
                    LEVEL {loc?.level ?? "B"} WIRE DECKING
                  </span>
                </div>

                {/* Massive, High-Contrast Physical Check-Digit Placard */}
                <div
                  data-testid="shelf-check-digit-plate"
                  onClick={() => handleScanLocation(loc?.checkDigit || "47")}
                  className={`pointer-events-auto cursor-pointer hover:ring-2 hover:ring-amber-300 select-none shrink-0 px-4 py-1.5 rounded-xl border-2 font-mono transition-all flex items-center gap-2 shadow-xl ${
                    isBeginner && activeBeat === 1
                      ? "bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-pulse"
                      : "bg-[#161C24] text-zinc-300 border-[#323C4A]"
                  }`}
                  title="Click or Scan Shelf Check Digit"
                >
                  <div className="text-right">
                    <div className="text-[9px] text-zinc-300 font-bold uppercase tracking-wider leading-none">
                      CHECK-DIGIT:
                    </div>
                    <div className="text-[9px] text-amber-400 font-bold leading-none mt-0.5">
                      SHELF BEAM
                    </div>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-wider">
                    [{loc?.checkDigit ?? "47"}]
                  </span>
                </div>
              </div>

              {/* BEAT 1 CALLOUT — docked directly beneath shelf header */}
              {isBeginner && activeBeat === 1 && (
                <div className="w-full flex justify-center mt-1.5 shrink-0 pointer-events-none">
                  <ScaffoldingCallout
                    beat={1}
                    checkDigit={loc?.checkDigit ?? "47"}
                  />
                </div>
              )}

              {/* In-Situ Shelf Surface with Photorealistic Product & Scannable Barcode */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-2">
                <div className="w-full max-w-2xl bg-zinc-950/80 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center gap-4">
                  {/* Photorealistic Product Image */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    <img
                      src={productImg}
                      alt={itm?.description ?? "Warehouse Item"}
                      className="w-28 h-28 sm:w-36 sm:h-36 object-contain rounded-xl bg-zinc-900/80 border border-zinc-700 p-2 shadow-xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
                      onError={(e) => {
                        // Graceful fallback to SVG if image not found
                        const target = e.currentTarget as HTMLImageElement
                        target.src = "/assets/products/item_widget_alpha.svg"
                      }}
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-zinc-400 font-bold border border-zinc-700">
                      1:1 RENDER
                    </div>
                  </div>

                  {/* Product Metadata & Barcode Card */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between w-full">
                    <div>
                      <div className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider">
                        INDUSTRIAL CARTON PACKAGE
                      </div>
                      <div className="text-base sm:text-xl font-black text-white font-mono truncate mt-0.5">
                        {itm?.description ?? "Widget Alpha 500ml"}
                      </div>
                      <div className="text-xs sm:text-sm font-mono text-zinc-300 mt-0.5">
                        SKU: <strong className="text-amber-300 font-bold">{itm?.sku ?? "024505572"}</strong>
                      </div>
                    </div>

                    {/* Scannable Barcode on Box — always tappable */}
                    <div
                      onClick={() => handleScanItem(itm?.upcBarcode ?? "012345678905")}
                      className={`pointer-events-auto cursor-pointer mt-2 p-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center shadow-lg ${
                        isBeginner && activeBeat === 2
                          ? "bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-pulse scale-[1.02]"
                          : "bg-white text-zinc-950 border-zinc-400 hover:border-zinc-200"
                      }`}
                      title="Click or Scan Item Barcode"
                    >
                      {/* Authentic Code 128 Barcode Simulation */}
                      <div className="w-full flex items-center justify-center h-8 gap-0.5 px-2 bg-white rounded overflow-hidden">
                        {[
                          3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 2, 3,
                          1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 4, 1, 2, 3,
                        ].map((w, i) => (
                          <div
                            key={i}
                            className={`h-full ${i % 2 === 0 ? "bg-black" : "bg-white"}`}
                            style={{ width: `${w * 1.6}px` }}
                          />
                        ))}
                      </div>
                      <div className="font-mono text-center text-xs sm:text-sm font-black mt-1 tracking-widest text-black">
                        {itm?.upcBarcode ?? "024505572001"}
                      </div>
                    </div>

                    {/* BEAT 2 CALLOUT — inline directly beneath barcode card */}
                    {isBeginner && activeBeat === 2 && (
                      <div className="w-full flex justify-center mt-1.5 pointer-events-none">
                        <ScaffoldingCallout beat={2} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── ZONE 2: 9-TOTE BATCH CART ─────────────────────────────────── */}
            <section className="flex-[46] min-h-0 bg-[#101418] border-2 border-[#28303A] rounded-2xl p-3 flex flex-col shadow-xl overflow-hidden">
              <div className="flex justify-between items-center gap-2 text-xs font-mono mb-1.5 shrink-0 border-b border-[#222A33] pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300 font-bold uppercase tracking-wider text-xs sm:text-sm">
                    9-TOTE BATCH CART ({session.cart.cartBarcode || "C000000083"})
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase bg-[#182028] px-2 py-0.5 rounded border border-[#283240]">
                    3-TIER ALUMINUM
                  </span>
                </div>
                <span
                  className={`font-black text-xs sm:text-sm shrink-0 ${
                    isBeginner && activeBeat === 4
                      ? "text-emerald-400 animate-pulse font-black"
                      : "text-zinc-300"
                  }`}
                >
                  TARGET: SLOT {targetSlot} ({targetToteId})
                </span>
              </div>

              {/* BEAT 4 CALLOUT — docked above tote grid */}
              {isBeginner && activeBeat === 4 && (
                <div className="grid grid-cols-3 gap-2 mb-1.5 shrink-0 pointer-events-none">
                  <ScaffoldingCallout
                    beat={4}
                    targetSlot={targetSlot}
                    targetToteId={targetToteId}
                    dockColumn={beat4DockColumn}
                  />
                </div>
              )}

              {/* 3×3 Cart Tote Grid — 3 Shelves (Top: 7-8-9, Mid: 4-5-6, Bot: 1-2-3) */}
              <div className="grid grid-cols-3 grid-rows-3 gap-2 font-mono text-center flex-1 min-h-0">
                {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((slot) => {
                  const isTarget = targetSlot === slot
                  const toteId = `TOTE-${String(slot).padStart(2, "0")}`

                  return (
                    <div
                      key={slot}
                      onClick={() => handleScanTote(toteId)}
                      className={`pointer-events-auto cursor-pointer min-h-0 py-2 px-2 rounded-xl border-2 font-bold text-xs flex flex-col justify-center items-center overflow-hidden transition-all shadow-md ${
                        isTarget && isBeginner && activeBeat === 4
                          ? "bg-emerald-950 text-emerald-200 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse scale-[1.02]"
                          : isTarget
                          ? "bg-emerald-950/60 text-emerald-300 border-emerald-600"
                          : "bg-[#171D24] text-zinc-400 border-[#28323E] hover:border-zinc-500 hover:text-zinc-200"
                      }`}
                      title={`Tote Slot ${slot}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wider text-zinc-300 leading-none">
                        <span>SLOT {slot}</span>
                        {isTarget && (
                          <span className="text-emerald-400 font-black text-[9px] bg-emerald-950 px-1 rounded border border-emerald-700">
                            ★ TARGET
                          </span>
                        )}
                      </div>
                      <div className="font-mono font-black text-xs sm:text-sm leading-tight mt-1 text-white">
                        {toteId}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          {/* ════════ RIGHT AREA: FULL-SIZE SYMBOL WT4090 TERMINAL (38%) ═════ */}
          <div className="lg:w-[420px] shrink-0 min-h-0 flex flex-col items-center justify-center overflow-hidden">
            {/* BEAT 3 CALLOUT — directly above the terminal keypad */}
            {isBeginner && activeBeat === 3 && (
              <div className="w-full flex justify-center mb-2 shrink-0 pointer-events-none">
                <ScaffoldingCallout
                  beat={3}
                  quantity={currentPick?.quantityRequired ?? 1}
                />
              </div>
            )}

            {/* Terminal Host: 100% full scale on desktop */}
            <div
              ref={terminalHostRef}
              className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            >
              <div
                className="shrink-0"
                style={
                  terminalFit
                    ? { width: terminalFit.width, height: terminalFit.height }
                    : undefined
                }
              >
                <div
                  ref={terminalContentRef}
                  className="block w-max shrink-0"
                  style={
                    terminalFit
                      ? {
                          transform: `scale(${terminalFit.scale})`,
                          transformOrigin: "top center",
                        }
                      : undefined
                  }
                >
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
              </div>
            </div>
          </div>
        </main>

        {/* ── IDLE HINT BANNER STRIP ───────────────────────────────────────── */}
        {isBeginner && (
          <div className="h-8 shrink-0 mb-1">
            <IdleHintBanner
              visible={isIdle}
              beat={activeBeat}
              checkDigit={loc?.checkDigit ?? "47"}
              quantity={currentPick?.quantityRequired ?? 1}
              targetSlot={targetSlot}
            />
          </div>
        )}

        {/* ── PERSISTENT 4-BEAT CADENCE FOOTER (48px / h-12) ───────────────── */}
        {!isAdvanced && (
          <footer className="h-12 shrink-0 bg-[#12161C] border border-[#2A3340] rounded-xl px-4 flex items-center justify-between gap-3 shadow-xl text-xs font-mono overflow-hidden">
            {/* Metronomic 4-Beat Guidance Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 overflow-hidden">
              <span className="text-zinc-400 font-black uppercase text-[10px] mr-1 hidden sm:inline">
                4-BEAT:
              </span>

              {/* Beat 1: Location */}
              <div
                className={`px-2.5 py-1 rounded-md font-black uppercase transition-all whitespace-nowrap text-xs ${
                  activeBeat === 1
                    ? "bg-amber-500 text-black shadow-[0_0_12px_#F59E0B]"
                    : "bg-[#1A2028] text-zinc-400"
                }`}
              >
                1. LOCATION [{loc?.checkDigit ?? "47"}]
              </div>

              {/* Beat 2: SKU */}
              <div
                className={`px-2.5 py-1 rounded-md font-black uppercase transition-all whitespace-nowrap text-xs ${
                  activeBeat === 2
                    ? "bg-cyan-500 text-black shadow-[0_0_12px_#38BDF8]"
                    : "bg-[#1A2028] text-zinc-400"
                }`}
              >
                2. SKU [{itm?.lastFourDigits ?? "8905"}]
              </div>

              {/* Beat 3: Quantity */}
              <div
                className={`px-2.5 py-1 rounded-md font-black uppercase transition-all whitespace-nowrap text-xs ${
                  activeBeat === 3
                    ? "bg-emerald-500 text-black shadow-[0_0_12px_#10B981]"
                    : "bg-[#1A2028] text-zinc-400"
                }`}
              >
                3. QTY [{currentPick?.quantityRequired ?? 1}]
              </div>

              {/* Beat 4: Tote */}
              <div
                className={`px-2.5 py-1 rounded-md font-black uppercase transition-all whitespace-nowrap text-xs ${
                  activeBeat === 4
                    ? "bg-purple-500 text-white shadow-[0_0_12px_#A855F7]"
                    : "bg-[#1A2028] text-zinc-400"
                }`}
              >
                4. TOTE [{targetSlot}]
              </div>

              {/* Protocol Quick-Reference Softkey */}
              <button
                type="button"
                onClick={() => setShowProtocolModal(true)}
                className="pointer-events-auto cursor-pointer ml-2 px-2 py-1 rounded-md bg-[#1D2530] hover:bg-[#283444] text-cyan-400 font-black border border-cyan-700/60 text-xs transition-colors whitespace-nowrap"
              >
                [?] PROTOCOL
              </button>
            </div>

            {/* Real-Time Telemetry: Pace, Accuracy, Clock */}
            <div className="flex items-center gap-3 sm:gap-4 text-zinc-300 text-xs shrink-0 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Pace:</span>
                <strong
                  className={`font-black text-sm ${
                    uph >= 140.0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {uph.toFixed(0)} UPH
                </strong>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Accuracy:</span>
                <strong
                  className={`font-black text-sm ${
                    ftpa >= 99.5 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {ftpa.toFixed(0)}%
                </strong>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-semibold">Clock:</span>
                <strong className="text-white font-black text-sm">{formatTime(elapsedSeconds)}</strong>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}
