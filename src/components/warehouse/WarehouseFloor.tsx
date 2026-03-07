/**
 * WarehouseFloor — Visual warehouse scene for the simulation three-panel layout
 *
 * Shows contextual warehouse visuals based on current workflow step:
 *   Build Cart (BC_*)  → 3×3 tote grid on cart
 *   Pick (PK_*)        → Shelf location with items (correct + decoys)
 *   Exception (EX_*)   → Exception resolution areas
 *   Post-Round (PS_*)  → Completion / next-tote
 *
 * Clicking scannable objects dispatches a SCAN action to the engine.
 * This component never contains business logic — only rendering and event delegation.
 *
 * Per CLAUDE.md §Architecture: components render only.
 * Per CLAUDE.md §Code Standards: no hardcoded warehouse data.
 */
"use client"

import { useCallback, useMemo } from "react"
import { WorkflowStep, type SimulationSession, type WarehouseItem, type ToteSlot } from "@/types/domain"
import { generateBarcodeDataUrl } from "@/data/barcode-utils"
import { getDecoyItems, getInputMode, selectScreen } from "@/hooks/useSimulation"
import type { DifficultyLevel } from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface WarehouseFloorProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  /** Callback when user clicks a scannable object on the floor */
  onScan: (barcode: string) => void
  /** Callback for physical-confirm steps (travel, verify, place) */
  onConfirm: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP CATEGORY HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isBuildCartStep(step: WorkflowStep): boolean {
  return step.startsWith("BC_")
}

function isPickStep(step: WorkflowStep): boolean {
  return step.startsWith("PK_")
}

function isExceptionStep(step: WorkflowStep): boolean {
  return step.startsWith("EX_")
}

function isPostStep(step: WorkflowStep): boolean {
  return step.startsWith("PS_")
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function WarehouseFloor({ session, difficulty, onScan, onConfirm }: WarehouseFloorProps) {
  const step = session.currentStep
  const screen = selectScreen(session)
  const inputMode = getInputMode(step, screen.inputType)

  return (
    <div className="bg-slate-100 rounded-xl border border-slate-300 p-4 h-full flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-slate-700 font-semibold text-sm tracking-wide">
          Warehouse Floor
        </h2>
        <span className="text-slate-400 text-[10px] font-mono">
          Zone {session.cart.zone}
        </span>
      </div>

      {/* Scene */}
      <div className="flex-1 flex items-center justify-center">
        {isBuildCartStep(step) && (
          <BuildCartScene
            session={session}
            onScan={onScan}
            onConfirm={onConfirm}
            inputMode={inputMode}
          />
        )}
        {isPickStep(step) && (
          <PickScene
            session={session}
            difficulty={difficulty}
            onScan={onScan}
            onConfirm={onConfirm}
            inputMode={inputMode}
          />
        )}
        {isExceptionStep(step) && (
          <ExceptionScene session={session} onConfirm={onConfirm} />
        )}
        {isPostStep(step) && <PostRoundScene session={session} />}
      </div>

      {/* Footer — current step hint */}
      <div className="text-slate-400 text-[10px] font-mono text-center truncate">
        {humanizeStep(step)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD CART SCENE — 3×3 tote grid + cart barcode
// Per BBWD-WI-030 §5.1: Build Cart procedure
// ─────────────────────────────────────────────────────────────────────────────

function BuildCartScene({
  session,
  onScan,
  onConfirm,
  inputMode,
}: {
  session: SimulationSession
  onScan: (barcode: string) => void
  onConfirm: () => void
  inputMode: string
}) {
  const step = session.currentStep

  // Before cart is scanned, show the cart barcode to scan
  if (step === WorkflowStep.BC_SCAN_CART_BARCODE) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-slate-600 text-sm font-medium">Scan the Pick Cart</div>
        <ScannableItem
          label="Pick Cart"
          barcode={session.cart.cartBarcode}
          onScan={onScan}
          highlight
        />
      </div>
    )
  }

  // Menu / login steps — show instructional placeholder
  if (
    step === WorkflowStep.BC_LOGIN_RF ||
    step === WorkflowStep.BC_SELECT_BBWD ||
    step === WorkflowStep.BC_SELECT_OUTBOUND ||
    step === WorkflowStep.BC_PRESS_CTRL_T ||
    step === WorkflowStep.BC_CONFIRM_TASK_GROUP ||
    step === WorkflowStep.BC_SCAN_ZONE_TASK_GROUP ||
    step === WorkflowStep.BC_SELECT_MAKE_TOTE_CART
  ) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
          <span className="text-2xl">📋</span>
        </div>
        <div className="text-slate-500 text-sm">
          Complete the steps on the RF Device
        </div>
        <div className="text-slate-400 text-xs">
          Use the RF terminal to navigate menus
        </div>
      </div>
    )
  }

  // Tote scanning: show 3×3 grid
  const currentSlot = session.currentToteSlot
  const totes = session.cart.totes

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="text-slate-600 text-sm font-medium">
        Load Totes onto Cart
      </div>

      {/* 3×3 tote grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]">
        {totes.map((tote, i) => {
          const slotNum = (i + 1) as ToteSlot
          const isCurrent = slotNum === currentSlot
          const isScanned = slotNum < currentSlot
          const canScan =
            isCurrent &&
            (step === WorkflowStep.BC_SCAN_TOTE_BARCODE)

          return (
            <button
              key={tote.toteId}
              onClick={canScan ? () => onScan(tote.barcode) : undefined}
              disabled={!canScan}
              className={`
                relative rounded-lg border-2 p-2 text-center transition-all
                min-h-[64px] flex flex-col items-center justify-center gap-1
                ${
                  isCurrent
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : isScanned
                      ? "border-green-400 bg-green-50"
                      : "border-slate-200 bg-white"
                }
                ${canScan ? "cursor-pointer hover:bg-blue-100 active:scale-95" : "cursor-default"}
              `}
            >
              <span
                className={`text-[10px] font-mono ${
                  isCurrent ? "text-blue-700" : isScanned ? "text-green-700" : "text-slate-400"
                }`}
              >
                Slot {slotNum}
              </span>
              {isScanned && (
                <span className="text-green-500 text-lg">✓</span>
              )}
              {isCurrent && !isScanned && (
                <span className="text-blue-500 text-xs font-mono truncate max-w-full">
                  {tote.barcode.slice(-6)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Place tote instruction */}
      {step === WorkflowStep.BC_PLACE_TOTE_IN_SLOT && (
        <button
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Place Tote in Slot {currentSlot} → Continue
        </button>
      )}

      {/* Slot progress indicator */}
      <div className="text-slate-400 text-xs font-mono">
        {Math.min(currentSlot - 1, 9)} / 9 totes loaded
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PICK SCENE — shelf location with items + decoys
// Per BBWD-WI-030 §5.2: Pick procedure
// ─────────────────────────────────────────────────────────────────────────────

function PickScene({
  session,
  difficulty,
  onScan,
  onConfirm,
  inputMode,
}: {
  session: SimulationSession
  difficulty: DifficultyLevel
  onScan: (barcode: string) => void
  onConfirm: () => void
  inputMode: string
}) {
  const step = session.currentStep
  const pick = session.pickQueue[session.currentPickIndex]
  const tote = pick
    ? session.cart.totes.find((t) => t.toteId === pick.targetToteId)
    : undefined

  // Decoy items for the shelf display
  const decoys = useMemo(
    () => getDecoyItems(session, difficulty),
    [session.currentPickIndex, difficulty] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Shuffle correct + decoys deterministically
  const shelfItems = useMemo(() => {
    if (!pick) return []
    const items: { item: WarehouseItem; isCorrect: boolean }[] = [
      { item: pick.item, isCorrect: true },
      ...decoys.map((d) => ({ item: d, isCorrect: false })),
    ]
    // Deterministic shuffle based on pickIndex
    const seed = session.currentPickIndex
    return items.sort((a, b) => {
      const ha = hashCode(a.item.itemId + seed)
      const hb = hashCode(b.item.itemId + seed)
      return ha - hb
    })
  }, [pick, decoys, session.currentPickIndex])

  if (!pick) return null

  // Scan item UPC — show shelf with scannable items
  if (step === WorkflowStep.PK_SCAN_ITEM_UPC) {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Location header */}
        <div className="bg-amber-100 border border-amber-300 rounded-lg px-4 py-2 text-center">
          <div className="text-amber-800 text-xs font-mono">Location</div>
          <div className="text-amber-900 text-lg font-bold font-mono">
            {pick.location.displayLabel}
          </div>
        </div>

        {/* Shelf with items */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 w-full">
          <div className="text-slate-500 text-[10px] font-mono mb-2">
            Pick Front — scan the correct item
          </div>
          <div className="grid grid-cols-1 gap-2">
            {shelfItems.map(({ item, isCorrect }) => (
              <ShelfItem
                key={item.itemId}
                item={item}
                onScan={() => onScan(item.upcBarcode)}
              />
            ))}
          </div>
        </div>

        {/* Pick info */}
        <div className="text-slate-500 text-xs font-mono text-center">
          Qty: {pick.quantityRequired} × {pick.item.unitOfMeasure} → Tote Slot{" "}
          {pick.targetSlot}
        </div>
      </div>
    )
  }

  // Scan tote barcode — show tote to scan
  if (step === WorkflowStep.PK_SCAN_TOTE_BARCODE && tote) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-slate-600 text-sm font-medium">
          Scan the Tote
        </div>
        <ScannableItem
          label={`Tote Slot ${pick.targetSlot}`}
          barcode={tote.barcode}
          onScan={() => onScan(tote.barcode)}
          highlight
        />
      </div>
    )
  }

  // End of tote display — show tote ready for conveyor
  if (step === WorkflowStep.PK_END_OF_TOTE_DISPLAY || step === WorkflowStep.PK_PRESS_CTRL_A) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">📦</span>
        </div>
        <div className="text-orange-700 text-sm font-semibold">End Of Tote</div>
        <div className="text-slate-500 text-xs">
          Press CTRL+A on the RF Device to confirm
        </div>
      </div>
    )
  }

  // Place tote on conveyor
  if (step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔄</span>
        </div>
        <div className="text-indigo-700 text-sm font-semibold">
          Place Tote on Conveyor (Putwall)
        </div>
        <button
          onClick={onConfirm}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Done — Continue
        </button>
      </div>
    )
  }

  // Physical action steps (travel, verify, place, pick quantity)
  if (inputMode === "CONFIRM") {
    const labels: Record<string, string> = {
      [WorkflowStep.PK_READ_PICK_DISPLAY]: "Read pick details on RF Device",
      [WorkflowStep.PK_TRAVEL_TO_LOCATION]: `Travel to ${pick.location.displayLabel}`,
      [WorkflowStep.PK_VERIFY_LOCATION]: `Verify location: ${pick.location.displayLabel}`,
      [WorkflowStep.PK_VERIFY_ITEM]: `Verify item: ${pick.item.description}`,
      [WorkflowStep.PK_PICK_QUANTITY]: `Pick ${pick.quantityRequired} × ${pick.item.unitOfMeasure}`,
      [WorkflowStep.PK_PLACE_IN_TOTE]: `Place in tote slot ${pick.targetSlot}`,
    }

    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
          <span className="text-2xl">
            {step === WorkflowStep.PK_TRAVEL_TO_LOCATION ? "🚶" : "👁️"}
          </span>
        </div>
        <div className="text-slate-600 text-sm font-medium">
          {labels[step] ?? "Complete the physical action"}
        </div>
        <button
          onClick={onConfirm}
          className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Done — Continue
        </button>
      </div>
    )
  }

  // Quantity entry steps
  if (step === WorkflowStep.PK_ENTER_QUANTITY) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
          <span className="text-2xl">🔢</span>
        </div>
        <div className="text-slate-600 text-sm font-medium">
          Enter quantity on RF Device: {pick.quantityRequired}
        </div>
      </div>
    )
  }

  // Default pick scene
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
        <div className="text-amber-900 font-mono text-sm font-bold">
          {pick.location.displayLabel}
        </div>
      </div>
      <div className="text-slate-500 text-xs">
        {pick.item.description} — Qty {pick.quantityRequired}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTION SCENE — error resolution areas
// Per BBWD-WI-030 §6: Exception Handling
// ─────────────────────────────────────────────────────────────────────────────

function ExceptionScene({
  session,
  onConfirm,
}: {
  session: SimulationSession
  onConfirm: () => void
}) {
  const step = session.currentStep

  const configs: Record<string, { icon: string; title: string; subtitle: string; color: string }> = {
    [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]: {
      icon: "⚠️",
      title: "Tote Already Allocated",
      subtitle: "Set aside and contact Lead/Supervisor",
      color: "red",
    },
    [WorkflowStep.EX_CART_ALREADY_CREATED]: {
      icon: "⚠️",
      title: "Cart Already Created",
      subtitle: "Set aside and contact Lead/Supervisor",
      color: "red",
    },
    [WorkflowStep.EX_INCORRECT_LOCATION]: {
      icon: "📍",
      title: "Incorrect Location",
      subtitle: "Press CTRL+W to go back and verify",
      color: "orange",
    },
    [WorkflowStep.EX_PRESS_CTRL_W]: {
      icon: "↩️",
      title: "Go Back",
      subtitle: "Press CTRL+W on the RF Device",
      color: "orange",
    },
    [WorkflowStep.EX_INCORRECT_TOTE]: {
      icon: "📦",
      title: "Incorrect Tote",
      subtitle: "Press CTRL+W to go back and verify",
      color: "orange",
    },
    [WorkflowStep.EX_INVALID_ITEM_LAST]: {
      icon: "❌",
      title: "Invalid Item (Last at Location)",
      subtitle: "Notify Lead → CTRL+K to skip → Item to Amnesty Bin",
      color: "red",
    },
    [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]: {
      icon: "❌",
      title: "Invalid Item",
      subtitle: "Notify Lead → Tote to Putwall → Item to IC",
      color: "red",
    },
    [WorkflowStep.EX_SHORT_INVENTORY]: {
      icon: "📉",
      title: "Short Inventory",
      subtitle: "Verify location → Notify Lead → CTRL+K",
      color: "yellow",
    },
    [WorkflowStep.EX_DAMAGED_ITEM]: {
      icon: "💔",
      title: "Damaged Item",
      subtitle: "Place in Amnesty Bin (ziplock if leaking)",
      color: "red",
    },
    [WorkflowStep.EX_NOTIFY_LEAD]: {
      icon: "📞",
      title: "Notify Lead / Supervisor",
      subtitle: "Press ENTER when acknowledged",
      color: "blue",
    },
    [WorkflowStep.EX_PRESS_CTRL_K]: {
      icon: "⏭️",
      title: "Skip Pick",
      subtitle: "Press CTRL+K on the RF Device",
      color: "orange",
    },
    [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]: {
      icon: "🗑️",
      title: "Item → Amnesty Bin",
      subtitle: "Place item in Amnesty Bin, press ENTER when done",
      color: "red",
    },
    [WorkflowStep.EX_ITEM_TO_IC]: {
      icon: "📋",
      title: "Item → Inventory Control",
      subtitle: "Place item in IC tote, press ENTER when done",
      color: "blue",
    },
  }

  const cfg = configs[step] ?? {
    icon: "⚠️",
    title: "Exception",
    subtitle: "Follow RF Device instructions",
    color: "gray",
  }

  const bgColors: Record<string, string> = {
    red: "bg-red-50 border-red-300",
    orange: "bg-orange-50 border-orange-300",
    yellow: "bg-yellow-50 border-yellow-300",
    blue: "bg-blue-50 border-blue-300",
    gray: "bg-slate-50 border-slate-300",
  }

  const textColors: Record<string, string> = {
    red: "text-red-800",
    orange: "text-orange-800",
    yellow: "text-yellow-800",
    blue: "text-blue-800",
    gray: "text-slate-700",
  }

  // Steps that need a confirm button on the warehouse floor
  const confirmSteps = new Set([
    WorkflowStep.EX_NOTIFY_LEAD,
    WorkflowStep.EX_ITEM_TO_AMNESTY_BIN,
    WorkflowStep.EX_ITEM_TO_IC,
    WorkflowStep.EX_TOTE_ALREADY_ALLOCATED,
    WorkflowStep.EX_CART_ALREADY_CREATED,
  ])

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div
        className={`rounded-xl border-2 p-6 w-full max-w-[280px] ${bgColors[cfg.color]}`}
      >
        <div className="text-3xl mb-3">{cfg.icon}</div>
        <div className={`font-semibold text-sm mb-1 ${textColors[cfg.color]}`}>
          {cfg.title}
        </div>
        <div className="text-slate-500 text-xs">{cfg.subtitle}</div>
      </div>
      {confirmSteps.has(step) && (
        <button
          onClick={onConfirm}
          className="bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Done — Continue
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-ROUND SCENE
// ─────────────────────────────────────────────────────────────────────────────

function PostRoundScene({ session }: { session: SimulationSession }) {
  const step = session.currentStep

  if (step === WorkflowStep.PS_ROUND_COMPLETE) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">🎉</span>
        </div>
        <div className="text-green-800 text-lg font-bold">Round Complete!</div>
        <div className="text-slate-500 text-sm">
          {session.completedPicks.length} picks completed
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="text-slate-600 text-sm">Continue to next tote</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** A scannable item on the warehouse floor — click to scan its barcode. */
function ScannableItem({
  label,
  barcode,
  onScan,
  highlight = false,
}: {
  label: string
  barcode: string
  onScan: (barcode: string) => void
  highlight?: boolean
}) {
  const barcodeUrl = useMemo(() => generateBarcodeDataUrl(barcode, 180, 50), [barcode])

  return (
    <button
      onClick={() => onScan(barcode)}
      className={`
        bg-white rounded-lg border-2 p-3 transition-all
        hover:shadow-lg active:scale-95 cursor-pointer
        flex flex-col items-center gap-2 min-w-[200px]
        ${highlight ? "border-blue-400 shadow-md" : "border-slate-200"}
      `}
    >
      <span className="text-slate-500 text-xs font-mono">{label}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={barcodeUrl} alt={barcode} className="w-[180px] h-[50px]" />
      <span className="text-slate-400 text-[10px] font-mono">{barcode}</span>
    </button>
  )
}

/** An item displayed on the shelf — clickable to scan its UPC. */
function ShelfItem({
  item,
  onScan,
}: {
  item: WarehouseItem
  onScan: () => void
}) {
  const barcodeUrl = useMemo(
    () => generateBarcodeDataUrl(item.upcBarcode, 140, 40),
    [item.upcBarcode]
  )

  return (
    <button
      onClick={onScan}
      className="
        bg-slate-50 hover:bg-blue-50 active:scale-[0.98]
        border border-slate-200 hover:border-blue-400
        rounded-lg p-3 text-left transition-all cursor-pointer
        flex items-center gap-3
      "
    >
      {/* Item visual */}
      <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-lg shrink-0">
        📦
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-700 text-xs font-medium truncate">
          {item.description}
        </div>
        <div className="text-slate-400 text-[10px] font-mono">
          SKU: {item.sku} · Last 4: {item.lastFourDigits}
        </div>
      </div>
      <div className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={barcodeUrl}
          alt={item.upcBarcode}
          className="w-[100px] h-[30px]"
        />
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/** Simple deterministic hash for shuffling. */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // Convert to 32-bit int
  }
  return hash
}

/** Human-readable step name for the footer. */
function humanizeStep(step: WorkflowStep): string {
  return step
    .replace(/^(BC_|PK_|PS_|EX_)/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}
