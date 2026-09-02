"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { RFDevice } from "@/components/simulator/RFDevice"
import { StepProgressBar } from "@/components/simulator/StepProgressBar"
import { CoachingPanel } from "@/components/simulator/CoachingPanel"
import { AccessibilityMenu } from "./AccessibilityMenu"
import { useSimulation } from "@/hooks/useSimulation"
import { useAccessibilityPrefs } from "@/hooks/useAccessibilityPrefs"
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

export function PhaserSimulationShell({
  difficulty = DifficultyLevel.BEGINNER,
  language = "en",
  className = "",
}: PhaserSimulationShellProps) {
  const session = useSimulation((s) => s.session)
  const coaching = useSimulation((s) => s.coaching)
  const actionCount = useSimulation((s) => s.actionCount)
  const estimatedTotalSteps = useSimulation((s) => s.estimatedTotalSteps)
  const result = useSimulation((s) => s.result)
  const reset = useSimulation((s) => s.reset)
  const { prefs, toggle } = useAccessibilityPrefs()
  const [a11yMenuOpen, setA11yMenuOpen] = useState(false)

  if (!session) return null

  const step = session.currentStep
  const pick = session.pickQueue[session.currentPickIndex]
  const guidanceText = getStepGuidanceText(step, pick?.location.displayLabel)
  const errorText = result && !result.success ? result.feedback ?? "Incorrect action. Check the RF Device screen." : ""
  const displayStep = Math.min(actionCount, estimatedTotalSteps)
  const displayTotal = estimatedTotalSteps > 0 ? estimatedTotalSteps : 1

  const a11yClassNames = [
    prefs.dyslexiaFont ? "dyslexia-mode" : "",
    prefs.reducedMotion ? "reduced-motion" : "",
    prefs.highContrast ? "high-contrast" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      id="phaser-fullscreen-immersive-shell"
      className={`fixed inset-0 w-screen h-screen z-[9999] bg-slate-950 flex flex-col overflow-hidden ${a11yClassNames} ${className}`}
    >
      {/* ── HEADER — solid, in normal document flow, never covers the scene ── */}
      <header className="relative shrink-0 z-20 bg-slate-900 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono font-black text-sm text-amber-400 uppercase bg-amber-950/70 px-3 py-1.5 rounded-lg border border-amber-800/80 tracking-wider">
            Kinetic OS
          </span>
          <span className="font-mono text-sm text-slate-200">
            Zone <strong className="text-amber-300">{session.cart.zone}</strong> · Task Group{" "}
            <strong className="text-slate-100">{session.cart.taskGroup}</strong>
          </span>
        </div>

        <div className="flex-1 min-w-[180px] max-w-md hidden md:block">
          <StepProgressBar
            totalSteps={displayTotal}
            currentStep={displayStep}
            label={`Step ${displayStep + 1} of ${displayTotal}`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setA11yMenuOpen(!a11yMenuOpen)}
            aria-expanded={a11yMenuOpen}
            className="touch-target px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 border border-slate-700"
          >
            Accessibility
          </button>
          <button
            type="button"
            onClick={reset}
            className="touch-target px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 border border-slate-700"
          >
            {t(language, "sim.exit")}
          </button>
        </div>

        {a11yMenuOpen && (
          <AccessibilityMenu prefs={prefs} onToggle={toggle} onClose={() => setA11yMenuOpen(false)} />
        )}
      </header>

      {/* ── INSTRUCTION BANNER — full width, static, part of layout flow.
          No shortcut button here: the trainee confirms via the real RF
          Device controls (SCAN/ENTER/soft keys) or a scene hotspot ───────── */}
      <div className="shrink-0 z-10 bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center gap-3">
        <span className="shrink-0 font-mono text-xs font-bold text-amber-400 uppercase bg-slate-800 px-2 py-1 rounded">
          Step action
        </span>
        <p className="flex-1 min-w-[200px] text-sm text-slate-100 leading-snug">
          {guidanceText}
        </p>
      </div>

      {/* ── SCREEN READER LIVE REGIONS ─────────────────────────────────────
          The canvas is a single opaque image to assistive tech, so step
          guidance is announced politely on every step change, and engine
          rejections (wrong scan, invalid key — §6 exception alerts) are
          announced assertively. Both are visually hidden. */}
      <div aria-live="polite" className="sr-only">
        {guidanceText}
      </div>
      <div aria-live="assertive" role="alert" className="sr-only">
        {errorText}
      </div>

      {/* ── MAIN ROW — canvas + RF panel are side-by-side siblings, so the RF
          panel can never sit on top of the warehouse floor, cart, or totes ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="relative flex-1 min-w-0 min-h-[240px] bg-slate-950">
          <PhaserWarehouseCanvas difficulty={difficulty} reducedMotion={prefs.reducedMotion} />
        </div>

        <aside
          id="rf-device-panel"
          className="shrink-0 w-full lg:w-[400px] max-h-[42vh] lg:max-h-none bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-700 flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-700 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-amber-400">WMS INDUSTRIAL TERMINAL</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col items-center gap-3">
            <div className="w-full max-w-[420px] flex justify-center">
              <RFDevice />
            </div>
            {coaching.isVisible && (
              <div className="w-full max-w-[420px]">
                <CoachingPanel coaching={coaching} difficulty={difficulty} language={language} />
              </div>
            )}
          </div>
        </aside>
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
