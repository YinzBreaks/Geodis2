"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { RFDevice } from "@/components/simulator/RFDevice"
import { StepProgressBar } from "@/components/simulator/StepProgressBar"
import { CoachingPanel } from "@/components/simulator/CoachingPanel"
import { useSimulation } from "@/hooks/useSimulation"
import { WorkflowStep, DifficultyLevel } from "@/types/domain"
import { t, type AppLanguage } from "@/lib/i18n"

// Dynamically import PhaserWarehouseCanvas with ssr: false
const PhaserWarehouseCanvas = dynamic(
  () => import("./PhaserWarehouseCanvas").then((mod) => mod.PhaserWarehouseCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-amber-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>Mounting 2.5D Warehouse Canvas...</span>
        </div>
      </div>
    ),
  }
)

interface PhaserSimulationShellProps {
  difficulty?: DifficultyLevel
  language?: AppLanguage
  className?: string
}

function isConfirmStep(step: WorkflowStep): boolean {
  return (
    step === WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER ||
    step === WorkflowStep.BC_RECEIVE_TOTE_COUNT ||
    step === WorkflowStep.BC_OBTAIN_CART ||
    step === WorkflowStep.BC_LOAD_TOTES ||
    step === WorkflowStep.BC_PLACE_TOTE_IN_SLOT ||
    step === WorkflowStep.PK_PICKUP_CART ||
    step === WorkflowStep.PK_LOGIN_RF ||
    step === WorkflowStep.PK_READ_PICK_DISPLAY ||
    step === WorkflowStep.PK_TRAVEL_TO_LOCATION ||
    step === WorkflowStep.PK_VERIFY_LOCATION ||
    step === WorkflowStep.PK_VERIFY_ITEM ||
    step === WorkflowStep.PK_PICK_QUANTITY ||
    step === WorkflowStep.PK_PLACE_IN_TOTE ||
    step === WorkflowStep.PK_PRESS_CTRL_A ||
    step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR
  )
}

function getConfirmButtonText(step: WorkflowStep): string {
  switch (step) {
    case WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER:
      return "Arrived at Command Center →"
    case WorkflowStep.BC_RECEIVE_TOTE_COUNT:
      return "Received Tote Count from CSR →"
    case WorkflowStep.BC_OBTAIN_CART:
      return "Obtained Pick Cart →"
    case WorkflowStep.BC_LOAD_TOTES:
      return "Loaded Totes onto Cart →"
    case WorkflowStep.BC_PLACE_TOTE_IN_SLOT:
      return "Placed Tote in Slot →"
    case WorkflowStep.PK_TRAVEL_TO_LOCATION:
      return "Arrived at Pick Front Location →"
    case WorkflowStep.PK_VERIFY_LOCATION:
      return "Location Verified →"
    case WorkflowStep.PK_VERIFY_ITEM:
      return "Item Verified →"
    case WorkflowStep.PK_PICK_QUANTITY:
      return "Picked Required Quantity →"
    case WorkflowStep.PK_PLACE_IN_TOTE:
      return "Placed in Tote →"
    case WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR:
      return "Place Completed Tote on Conveyor →"
    default:
      return "Continue →"
  }
}

export function PhaserSimulationShell({
  difficulty = DifficultyLevel.BEGINNER,
  language = "en",
  className = "",
}: PhaserSimulationShellProps) {
  const session = useSimulation((s) => s.session)
  const coaching = useSimulation((s) => s.coaching)
  const actionCount = useSimulation((s) => s.actionCount)
  const estimatedTotalSteps = useSimulation((s) => s.estimatedTotalSteps)
  const processInput = useSimulation((s) => s.processInput)
  const reset = useSimulation((s) => s.reset)

  const [drawerOpen, setDrawerOpen] = useState(true)
  const [drawerDock, setDrawerDock] = useState<"side" | "bottom">("side")

  if (!session) return null

  const step = session.currentStep
  const pick = session.pickQueue[session.currentPickIndex]
  const displayStep = Math.min(actionCount, estimatedTotalSteps)
  const displayTotal = estimatedTotalSteps > 0 ? estimatedTotalSteps : 1
  const needsPhysicalConfirm = isConfirmStep(step)

  const handleConfirm = () => {
    processInput({ type: "CONFIRM", value: "", source: "click" })
  }

  return (
    <div
      id="phaser-fullscreen-immersive-shell"
      className={`relative w-full h-[100dvh] overflow-hidden bg-slate-950 ${className}`}
    >
      {/* ── 1. FULLSCREEN CANVAS LAYER (z-0, absolute inset-0) ─────────────── */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <PhaserWarehouseCanvas difficulty={difficulty} />
      </div>

      {/* ── 2. FLOATING TOP HEADER OVERLAY (z-10, bg-gray-900/80) ─────────── */}
      <header className="absolute top-0 left-0 right-0 w-full z-10 bg-gray-900/80 backdrop-blur-md border-b border-slate-700/80 px-4 py-2.5 flex items-center justify-between gap-3 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xs tracking-wider text-amber-400 uppercase bg-amber-950/70 px-2.5 py-1 rounded border border-amber-800/80 shadow-inner">
            2.5D WAREHOUSE PRO
          </span>
          <span className="font-mono text-xs text-slate-300 hidden sm:inline">
            Zone <span className="text-amber-300 font-bold">{session.cart.zone}</span> · Task Grp{" "}
            <span className="text-slate-100 font-bold">{session.cart.taskGroup}</span>
          </span>
        </div>

        {/* Action Prompt Button (Continue / Confirm for physical steps) */}
        {needsPhysicalConfirm && (
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs font-mono shadow-lg transition-transform active:scale-95 animate-pulse"
          >
            {getConfirmButtonText(step)}
          </button>
        )}

        {/* Step Progress & Controls */}
        <div className="flex items-center gap-3">
          <div className="w-36 sm:w-56 hidden md:block">
            <StepProgressBar
              totalSteps={displayTotal}
              currentStep={displayStep}
              label={`Step ${displayStep + 1} of ${displayTotal}`}
            />
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-amber-400 border border-slate-700 font-bold shadow"
          >
            {drawerOpen ? "Hide RF Device" : "Show RF Device"}
          </button>

          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 border border-slate-700"
          >
            {t(language, "sim.exit")}
          </button>
        </div>
      </header>

      {/* ── 3. FLOATING INSTRUCTION CARD (Top-Left under header) ─────────────── */}
      <div className="absolute top-16 left-4 z-20 max-w-sm bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-none">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-mono text-[10px] text-amber-400 uppercase font-bold tracking-wider">
            SOP STEP ACTION
          </span>
          <span className="font-mono text-[9px] text-slate-400">{step}</span>
        </div>
        <p className="font-ui text-xs text-slate-100 font-medium leading-snug">
          {getStepGuidanceText(step, pick?.location.displayLabel)}
        </p>
      </div>

      {/* ── 4. FLOATING RIGHT SIDE-DRAWER OVERLAY (z-10, bg-slate-900/95) ──── */}
      {drawerOpen && (
        <aside
          id="rf-floating-drawer"
          className={`absolute ${
            drawerDock === "side"
              ? "right-6 top-16 bottom-6 w-[450px] max-w-[45vw]"
              : "left-4 right-4 bottom-4 h-[380px]"
          } z-10 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700 pointer-events-auto flex flex-col overflow-hidden transition-all duration-300`}
        >
          {/* Drawer Header Toolbar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] font-bold text-amber-400 tracking-wider">
                SYMBOL WT4000 RF DEVICE
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDrawerDock(drawerDock === "side" ? "bottom" : "side")}
                className="min-h-[44px] min-w-[44px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center justify-center"
                title="Dock layout"
              >
                {drawerDock === "side" ? "Dock Bottom" : "Dock Right"}
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-400 border border-slate-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* WT4000 Photo-Realistic Shell Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col items-center justify-start gap-3">
            <div className="w-full max-w-[420px] flex justify-center">
              <RFDevice />
            </div>

            {/* Coaching Guidance in beginner mode */}
            {coaching.isVisible && (
              <div className="w-full max-w-[420px]">
                <CoachingPanel
                  coaching={coaching}
                  difficulty={difficulty}
                  language={language}
                />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── 5. FLOATING QUICK-SCAN BARCODE ACTIONS (Bottom-Left above camera HUD) ───────────── */}
      <div className="absolute bottom-20 left-6 z-20 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto">
        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">Active Target:</span>
        {step === WorkflowStep.BC_SCAN_ZONE_TASK_GROUP && (
          <button
            type="button"
            onClick={() => processInput({ type: "SCAN", value: "Z1", source: "click" })}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Scan Bulk Zone (Z1)
          </button>
        )}
        {step === WorkflowStep.BC_SCAN_CART_BARCODE && (
          <button
            type="button"
            onClick={() => processInput({ type: "SCAN", value: "C000000083", source: "click" })}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Scan Cart (C000000083)
          </button>
        )}
        {step === WorkflowStep.BC_SCAN_TOTE_BARCODE && (
          <button
            type="button"
            onClick={() =>
              processInput({
                type: "SCAN",
                value: `T0000000001169${session.currentToteSlot}`,
                source: "click",
              })
            }
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Scan Tote #{session.currentToteSlot}
          </button>
        )}
        {step === WorkflowStep.PK_SCAN_ITEM_UPC && (
          <button
            type="button"
            onClick={() =>
              processInput({
                type: "SCAN",
                value: pick?.item.upcBarcode || "024505572001",
                source: "click",
              })
            }
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Scan Item UPC ({pick?.item.lastFourDigits || "2001"})
          </button>
        )}
        {step === WorkflowStep.PK_SCAN_TOTE_BARCODE && (
          <button
            type="button"
            onClick={() => {
              const targetTote = session.cart.totes.find((t) => t.slot === pick?.targetSlot)
              processInput({
                type: "SCAN",
                value: targetTote?.barcode || `T0000000001169${pick?.targetSlot || 1}`,
                source: "click",
              })
            }}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Scan Target Tote (Slot {pick?.targetSlot || 1})
          </button>
        )}
        {step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR && (
          <button
            type="button"
            onClick={() => processInput({ type: "CONFIRM", value: "", source: "click" })}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-blue-500 hover:bg-blue-400 active:bg-blue-600 text-white font-mono font-bold text-xs rounded-lg shadow transition-transform active:scale-95 animate-bounce"
          >
            Place Tote on Conveyor
          </button>
        )}
      </div>
    </div>
  )
}

function getStepGuidanceText(step: WorkflowStep, locLabel?: string): string {
  switch (step) {
    case WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER:
      return "Travel to Command Center. Click 'Arrived at Command Center' or tap the canvas."
    case WorkflowStep.BC_RECEIVE_TOTE_COUNT:
      return "Receive tote assignment from Tasker/CSR and confirm."
    case WorkflowStep.BC_OBTAIN_CART:
      return "Obtain your 3-tier pick cart and confirm."
    case WorkflowStep.BC_LOAD_TOTES:
      return "Load 9 empty gray storage totes onto your cart and confirm."
    case WorkflowStep.BC_LOGIN_RF:
      return "Type your User ID into the Symbol RF Device and press Enter."
    case WorkflowStep.BC_SELECT_BBWD:
      return "Type '1' on the RF Device keypad to select BBWD Picking."
    case WorkflowStep.BC_SELECT_OUTBOUND:
      return "Type '2' on the RF Device keypad to select Outbound Phase II."
    case WorkflowStep.BC_PRESS_CTRL_T:
      return "Press CTRL+T on the RF Device keypad to change Task Group."
    case WorkflowStep.BC_CONFIRM_TASK_GROUP:
      return "Press Enter twice on the RF Device to confirm Task Group."
    case WorkflowStep.BC_SCAN_ZONE_TASK_GROUP:
      return "Tap the yellow Bulk Zone rafter placard on the canvas or click the scan target."
    case WorkflowStep.BC_SELECT_MAKE_TOTE_CART:
      return "Type '1' on the RF Device for 'Make Tote Cart BB'."
    case WorkflowStep.BC_SCAN_CART_BARCODE:
      return "Tap the Pick Cart barcode (top-left label C000000083) to scan cart."
    case WorkflowStep.BC_PLACE_TOTE_IN_SLOT:
      return "Place gray tote into slot and press Continue."
    case WorkflowStep.BC_SCAN_TOTE_BARCODE:
      return "Tap the gray storage tote or slot label to scan tote barcode into cart."
    case WorkflowStep.BC_PRESS_CTRL_E:
      return "All 9 totes loaded! Press CTRL+E to finalize cart build and begin picking."
    case WorkflowStep.PK_READ_PICK_DISPLAY:
      return `RF Device displays first pick at ${locLabel || "shelf location"}. Press Continue.`
    case WorkflowStep.PK_TRAVEL_TO_LOCATION:
      return `Traveling to Pick Front ${locLabel || "316-001-A1"}... Camera zooms to aisle.`
    case WorkflowStep.PK_VERIFY_LOCATION:
      return `Verify physical location ${locLabel || "316-001-A1"} matches RF Device display.`
    case WorkflowStep.PK_VERIFY_ITEM:
      return "Verify item SKU and last 4 digits match RF screen."
    case WorkflowStep.PK_SCAN_ITEM_UPC:
      return "Tap the Item UPC barcode on the zoomed shelf hotspot to scan item."
    case WorkflowStep.PK_PICK_QUANTITY:
      return "Pick the required item quantity from the shelf."
    case WorkflowStep.PK_PLACE_IN_TOTE:
      return "Place item(s) in the target tote on your cart."
    case WorkflowStep.PK_ENTER_QUANTITY:
      return "Type quantity picked on RF Device and press Enter."
    case WorkflowStep.PK_SCAN_TOTE_BARCODE:
      return "Tap the highlighted target tote on the cart to confirm placement."
    case WorkflowStep.PK_END_OF_TOTE_DISPLAY:
      return "End Of Tote reached! Press CTRL+A on the RF Device to confirm."
    case WorkflowStep.PK_PRESS_CTRL_A:
      return "Confirming tote complete... Transitioning to conveyor view."
    case WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR:
      return "Tap the Conveyor Belt drop zone to place completed tote on the line."
    case WorkflowStep.PS_ROUND_COMPLETE:
      return "Picking round complete! Review your score."
    default:
      return "Follow the SOP prompts on the RF Device and interact with warehouse hotspots."
  }
}

export default PhaserSimulationShell
