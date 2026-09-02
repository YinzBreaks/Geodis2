"use client"

import React, { useState, useEffect } from "react"
import type {
  SimulationSession,
  EngineResult,
  SessionScore,
  WarehouseLocation,
  WarehouseItem,
} from "@/types/domain"
import { WorkflowStep } from "@/types/domain"
import type { CoachingState } from "@/types/coaching"
import { selectScreen, getInputMode } from "@/hooks/useSimulation"
import type { CanonicalInput } from "@/engine/process-input"
import { PickFaceElevation } from "@/components/warehouse/PickFaceElevation"
import { SerpentineRouteMap } from "@/components/warehouse/SerpentineRouteMap"
import { KineticTerminalHUD } from "@/components/simulator/KineticTerminalHUD"
import { HardwareScannerPill } from "@/components/simulator/HardwareScannerPill"

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

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
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

  // Real-time telemetry calculations
  const totalPicks = session.completedPicks.length
  const uph =
    elapsedSeconds > 0
      ? Number(((totalPicks / (elapsedSeconds / 3600))).toFixed(1))
      : 0.0

  const ftpa = score?.firstTimePickAccuracy ?? 100.0

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const handleScan = (barcode: string) => {
    processInput({ type: "SCAN", value: barcode, source: "click" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
    processInput({ type: "SOFTKEY", value: key, source: "click" })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit(e)
    }
  }

  // Determine defect type if any on current pick
  const defectType = currentPick?.itemDefect

  return (
    <div className="fixed inset-0 w-screen h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-hidden font-sans select-none z-[9999]">
      {/* ── COCKPIT TOP STATUS BAR ────────────────────────────────────────── */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="font-mono text-sm font-black tracking-widest text-white uppercase">
              KINETIC OS
            </span>
          </div>
          <span className="text-zinc-600">/</span>
          <span className="font-mono text-xs text-zinc-400 font-bold uppercase">
            Aisle {currentPick?.location.aisle ?? "316"} · Bay {currentPick?.location.bay ?? "01"}
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] uppercase font-bold border border-zinc-700">
            Pick {session.currentPickIndex + 1} of {session.pickQueue.length}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <HardwareScannerPill compact />

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="glove-target px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              EXIT
            </button>
          )}
        </div>
      </header>

      {/* ── THREE-VIEWPORT SYNCHRONIZED INDUSTRIAL GRID ────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* VIEWPORT A: Pick Face Elevation & Wire Decking (Left 4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              VIEWPORT A: PICK FACE ELEVATION
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-400">
              Check-Digit: [{currentPick?.location.checkDigit ?? "—"}]
            </span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center my-2 overflow-hidden">
            <PickFaceElevation
              location={currentPick?.location as WarehouseLocation}
              item={currentPick?.item as WarehouseItem}
              defectType={defectType}
              onScan={handleScan}
              scannable
              highlighted
            />
          </div>

          {/* Active 9-Tote Cart Slot Destination Pulse */}
          <div className="bg-black/60 border border-zinc-800 rounded-xl p-2.5 shrink-0">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 uppercase mb-1.5">
              <span>9-TOTE BATCH CART STATUS</span>
              <span className="text-emerald-400 font-bold">
                TARGET: SLOT {currentPick?.targetSlot ?? 1} ({currentPick?.targetToteId ?? "TOTE-01"})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 font-mono text-center text-xs">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((slot) => {
                const isTarget = currentPick?.targetSlot === slot
                return (
                  <div
                    key={slot}
                    className={`py-1.5 px-2 rounded border font-bold transition-all ${
                      isTarget
                        ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-950 animate-pulse"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    SLOT {slot}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* VIEWPORT B: Overhead Serpentine Traversal Map (Center 4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-800 shrink-0">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              VIEWPORT B: OVERHEAD SERPENTINE ROUTE
            </span>
            <span className="text-[10px] font-mono font-bold text-cyan-400">
              S-CURVE TRAVERSAL
            </span>
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden my-2">
            <SerpentineRouteMap session={session} width={340} height={380} />
          </div>

          <div className="text-[10px] text-zinc-500 font-mono text-center shrink-0 border-t border-zinc-800 pt-2">
            Monotonic Bay Progression (Bay 01 &rarr; 04) · Zero Yo-Yo Backtracking
          </div>
        </div>

        {/* VIEWPORT C: WMS Monospace Terminal Glass (Right 4 cols) */}
        <div className="lg:col-span-4 flex flex-col overflow-hidden">
          <KineticTerminalHUD
            session={session}
            rfScreen={rfScreen}
            inputValue={inputValue}
            inputMode={inputMode}
            isComplete={false}
            showFeedback={result ? !result.success : false}
            result={result}
            inputError={null}
            coaching={coaching}
            handleSubmit={handleSubmit}
            handleKeyDown={handleKeyDown}
            handleSoftKey={handleSoftKey}
            setInputValue={setInputValue}
            onPullTrigger={() => {
              if (inputMode === "SCAN" && currentPick?.location?.barcode) {
                handleScan(currentPick.location.barcode)
              } else {
                handleSubmit({ preventDefault: () => {} } as React.FormEvent)
              }
            }}
          />
        </div>
      </div>

      {/* ── PERSISTENT METRONOMIC 4-BEAT CADENCE FOOTER STRIP ─────────────── */}
      <footer className="bg-black border-t-2 border-zinc-800 px-4 py-2.5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 shadow-2xl">
        {/* Left: 4-Beat Rhythm Progress Bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest hidden xl:inline">
            CADENCE BEAT:
          </span>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                activeBeat === 1
                  ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}
            >
              <span>1</span> <span>LOCATION</span>
            </div>

            <span className="text-zinc-600">&rarr;</span>

            <div
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                activeBeat === 2
                  ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}
            >
              <span>2</span> <span>SKU</span>
            </div>

            <span className="text-zinc-600">&rarr;</span>

            <div
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                activeBeat === 3
                  ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}
            >
              <span>3</span> <span>QTY</span>
            </div>

            <span className="text-zinc-600">&rarr;</span>

            <div
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
                activeBeat === 4
                  ? "bg-emerald-950 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-950 ring-2 ring-emerald-500/50"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800"
              }`}
            >
              <span>4</span> <span>TOTE</span>
            </div>
          </div>
        </div>

        {/* Right: Real-time Pace & Accuracy Tabular Telemetry */}
        <div className="flex items-center gap-6 font-mono text-xs tabular-nums">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Pace:</span>
            <span className="text-base font-black text-amber-400">{uph}</span>
            <span className="text-[10px] text-zinc-500">UPH</span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Accuracy:</span>
            <span className="text-base font-black text-emerald-400">{ftpa.toFixed(1)}%</span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Clock:</span>
            <span className="text-base font-black text-white">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
