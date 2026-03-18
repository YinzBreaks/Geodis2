/**
 * WarehouseFloor — Visual warehouse scene with scannable assets
 *
 * Renders contextual warehouse visuals based on current workflow step.
 * Assets (cart, totes, shelf, items) are displayed with scannable barcode
 * labels. Clicking a barcode triggers a 250ms scan beam animation, then
 * submits the barcode value to the simulation engine.
 *
 * The panel replaces the old text-input scanning mechanic with a
 * point-and-click system that mimics a real scan gun.
 *
 * Per CLAUDE.md §Architecture: components render only — no business logic.
 * Per CLAUDE.md §Code Standards: no hardcoded warehouse data.
 */
"use client"

import { useMemo } from "react"
import { WorkflowStep, DifficultyLevel, type SimulationSession, type WarehouseItem, type ToteSlot } from "@/types/domain"
import { getAssetContext } from "@/lib/assetContext"
import { getDecoyItems } from "@/hooks/useSimulation"
import { BarcodeLabel, BarcodeScanStyles } from "./assets/BarcodeLabel"
import { PickCart } from "./assets/PickCart"
import { PickTote } from "./assets/PickTote"
import { ShelfLocation } from "./assets/ShelfLocation"
import { ItemLabel } from "./assets/ItemLabel"

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface WarehouseFloorProps {
  session: SimulationSession
  difficulty: DifficultyLevel
  /** Callback when user scans (clicks) a barcode label on the floor */
  onScan: (barcode: string) => void
  /** Callback for physical-confirm steps (travel, verify, place) */
  onConfirm: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function WarehouseFloor({ session, difficulty, onScan, onConfirm }: WarehouseFloorProps) {
  const step = session.currentStep
  const ctx = getAssetContext(step, session)

  // Difficulty-aware highlighting: ADVANCED never highlights
  const effectiveHighlight = difficulty === DifficultyLevel.ADVANCED
    ? null
    : ctx.highlightedBarcode

  return (
    <div id="warehouse-floor" className="bg-slate-100 rounded-xl border border-slate-300 p-4 h-full flex flex-col gap-3 overflow-hidden">
      {/* Inject CSS keyframes for scan beam + asset pulse animations */}
      <BarcodeScanStyles />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-slate-700 font-semibold text-sm tracking-wide">
          WAREHOUSE FLOOR
        </h2>
        <span className="text-slate-400 text-[10px] font-mono">
          Zone {session.cart.zone}
        </span>
      </div>

      {/* Scene — contextual based on current step */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        {ctx.scannableAsset === "zone" && (
          <ZoneCard
            zone={session.cart.taskGroup}
            scannable={true}
            highlighted={effectiveHighlight === session.cart.taskGroup}
            difficulty={difficulty}
            onScan={onScan}
          />
        )}
        {ctx.showShelf && (
          <ShelfScene
            session={session}
            difficulty={difficulty}
            ctx={ctx}
            effectiveHighlight={effectiveHighlight}
            onScan={onScan}
          />
        )}
        {ctx.showCart && !ctx.showShelf && ctx.scannableAsset !== "zone" && (
          <CartScene
            session={session}
            difficulty={difficulty}
            ctx={ctx}
            effectiveHighlight={effectiveHighlight}
            onScan={onScan}
          />
        )}
        {!ctx.showCart && !ctx.showShelf && ctx.scannableAsset !== "zone" && (
          <PostRoundOverlay session={session} />
        )}
      </div>

      {/* Exception overlay — shown on top of the scene during EX_* steps */}
      {step.startsWith("EX_") && (
        <ExceptionBanner step={step} onConfirm={onConfirm} />
      )}

      {/* Confirm action steps — physical actions that need a button press */}
      {isConfirmPhysicalStep(step) && !step.startsWith("EX_") && (
        <ConfirmActionBar step={step} session={session} onConfirm={onConfirm} />
      )}

      {/* Footer — instruction hint */}
      <Footer step={step} difficulty={difficulty} scannableAsset={ctx.scannableAsset} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE CARD — laminated tag shown during BC_SCAN_ZONE_TASK_GROUP
// Per BBWD-WI-030 §5.1.9: scan zone or FEX barcode
// ─────────────────────────────────────────────────────────────────────────────

function getZoneCardHighlightStyle(highlighted: boolean, difficulty: DifficultyLevel): React.CSSProperties {
  if (!highlighted || difficulty === DifficultyLevel.ADVANCED) return {}
  if (difficulty === DifficultyLevel.BEGINNER) {
    return {
      boxShadow: "0 0 20px rgba(240, 165, 0, 0.7)",
      animation: "assetPulse 1.5s ease-in-out infinite",
    }
  }
  return { boxShadow: "0 0 8px rgba(240, 165, 0, 0.3)" }
}

/**
 * ZoneCard — a laminated cage-tag card showing the zone barcode.
 * Rendered during BC_SCAN_ZONE_TASK_GROUP so trainees can click-to-scan.
 *
 * The barcode value is session.cart.taskGroup ("Z1", "Z2", "HAZ", "FEX").
 * The engine validator at BC_SCAN_ZONE_TASK_GROUP checks:
 *   scannedValue === session.cart.taskGroup
 */
function ZoneCard({
  zone,
  scannable,
  highlighted,
  difficulty,
  onScan,
}: {
  zone: string
  scannable: boolean
  highlighted: boolean
  difficulty: DifficultyLevel
  onScan: (barcode: string) => void
}) {
  const isFex = zone === "FEX"
  const highlightStyle = getZoneCardHighlightStyle(highlighted, difficulty)

  return (
    <div
      className="relative flex flex-col items-center gap-3"
      style={{ ...highlightStyle, borderRadius: 8, padding: 8, transition: "box-shadow 0.3s" }}
    >
      {/* Laminated card tag */}
      <div
        style={{
          width: 140,
          backgroundColor: isFex ? "#fef3c7" : "#fef9c3",
          border: `2px solid ${isFex ? "#f59e0b" : "#ca8a04"}`,
          borderRadius: 8,
          padding: "16px 12px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          position: "relative",
        }}
      >
        {/* Hole punch at top (cage tag appearance) */}
        <div
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 18,
            height: 18,
            borderRadius: "50%",
            backgroundColor: "#e5e7eb",
            border: "2px solid #9ca3af",
          }}
        />

        {/* Zone text */}
        <div
          style={{
            fontFamily: "monospace",
            fontWeight: 800,
            fontSize: 36,
            color: isFex ? "#b45309" : "#713f12",
            letterSpacing: "0.05em",
            lineHeight: 1,
          }}
        >
          {zone}
        </div>

        {/* Sub-label */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "#92400e",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {isFex ? "EXPRESS" : "TASK GROUP"}
        </div>

        {/* Scannable barcode */}
        <BarcodeLabel
          value={zone}
          scannable={scannable}
          difficulty={difficulty}
          onScan={onScan}
        />
      </div>

      {/* BEGINNER: “← SCAN THIS” badge */}
      {highlighted && scannable && difficulty === DifficultyLevel.BEGINNER && (
        <div
          style={{
            position: "absolute",
            right: -2,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(240, 165, 0, 0.9)",
            color: "#000",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "monospace",
            padding: "2px 6px",
            borderRadius: 3,
            whiteSpace: "nowrap",
          }}
        >
          ← SCAN THIS
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SHELF SCENE — during pick steps
// Per BBWD-WI-030 §5.2: Pick procedure
// ─────────────────────────────────────────────────────────────────────────────

function ShelfScene({
  session,
  difficulty,
  ctx,
  effectiveHighlight,
  onScan,
}: {
  session: SimulationSession
  difficulty: DifficultyLevel
  ctx: ReturnType<typeof getAssetContext>
  effectiveHighlight: string | null
  onScan: (barcode: string) => void
}) {
  const pick = session.pickQueue[session.currentPickIndex]

  // Decoy items for difficulty-aware shelf display.
  // Hooks must be called unconditionally — getDecoyItems returns [] when pick is null.
  const decoys = useMemo(
    () => getDecoyItems(session, difficulty),
    [session.currentPickIndex, difficulty] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Shuffle correct item + decoys deterministically.
  // Guard against no active pick (returns empty array, component returns null below).
  const shelfItems = useMemo(() => {
    if (!pick) return []
    const items: { item: WarehouseItem; isCorrect: boolean }[] = [
      { item: pick.item, isCorrect: true },
      ...decoys.map((d) => ({ item: d, isCorrect: false })),
    ]
    const seed = session.currentPickIndex
    return items.sort((a, b) => {
      const ha = hashCode(a.item.itemId + seed)
      const hb = hashCode(b.item.itemId + seed)
      return ha - hb
    })
  }, [pick, decoys, session.currentPickIndex])

  if (!pick) return null

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Shelf with location */}
      <ShelfLocation
        aloc={pick.location.displayLabel}
        itemBarcode={pick.item.upcBarcode}
        itemName={pick.item.description}
        quantity={pick.quantityRequired}
        scannable={ctx.scannableAsset === "location"}
        highlighted={effectiveHighlight === pick.location.displayLabel}
        difficulty={difficulty}
        onScan={onScan}
      />

      {/* Item labels — shown during PK_SCAN_ITEM_UPC */}
      {ctx.showItem && ctx.scannableAsset === "item" && (
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {shelfItems.map(({ item, isCorrect }) => (
            <ItemLabel
              key={item.itemId}
              itemBarcode={item.upcBarcode}
              itemName={item.description}
              scannable={true}
              highlighted={isCorrect && effectiveHighlight === item.upcBarcode}
              difficulty={difficulty}
              onScan={onScan}
            />
          ))}
        </div>
      )}

      {/* Pick info */}
      <div className="text-slate-500 text-[10px] font-mono text-center">
        Qty: {pick.quantityRequired} × {pick.item.unitOfMeasure} → Tote S{pick.targetSlot}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CART SCENE — during build cart + tote scan steps
// Per BBWD-WI-030 §5.1: Build Cart procedure
// ─────────────────────────────────────────────────────────────────────────────

function CartScene({
  session,
  difficulty,
  ctx,
  effectiveHighlight,
  onScan,
}: {
  session: SimulationSession
  difficulty: DifficultyLevel
  ctx: ReturnType<typeof getAssetContext>
  effectiveHighlight: string | null
  onScan: (barcode: string) => void
}) {
  const cartHighlighted = ctx.scannableAsset === "cart" &&
    effectiveHighlight === session.cart.cartBarcode

  return (
    <div className="flex flex-col items-center gap-3">
      <PickCart
        cartBarcode={session.cart.cartBarcode}
        scannable={ctx.scannableAsset === "cart"}
        highlighted={cartHighlighted}
        difficulty={difficulty}
        onScan={onScan}
      />

      {/* Tote grid — 3×3 when showTotes is true */}
      {ctx.showTotes && (
        <ToteGrid
          session={session}
          difficulty={difficulty}
          scannableAsset={ctx.scannableAsset}
          activeToteSlot={ctx.activeToteSlot ?? null}
          effectiveHighlight={effectiveHighlight}
          onScan={onScan}
        />
      )}

      {/* Slot progress indicator */}
      {ctx.showTotes && (
        <div className="text-slate-400 text-xs font-mono">
          {(session.currentStep === WorkflowStep.BC_PRESS_CTRL_E ||
            session.currentStep.startsWith("PK_")
              ? 9
              : Math.min(session.currentToteSlot - 1, 9)
          )} / 9 totes loaded
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTE GRID — 3×3 grid of tote components
// ─────────────────────────────────────────────────────────────────────────────

function ToteGrid({
  session,
  difficulty,
  scannableAsset,
  activeToteSlot,
  effectiveHighlight,
  onScan,
}: {
  session: SimulationSession
  difficulty: DifficultyLevel
  scannableAsset: string | null
  /** Per-pick target slot from assetContext; null during build-cart steps. */
  activeToteSlot: ToteSlot | null
  effectiveHighlight: string | null
  onScan: (barcode: string) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5" style={{ maxWidth: 280 }}>
      {session.cart.totes.map((tote, i) => {
        const slotNum = (i + 1) as ToteSlot
        // During pick phase, use pick.targetSlot (from activeToteSlot) to
        // determine which tote is scannable. Fall back to currentToteSlot
        // during build cart (activeToteSlot is null except at PK_SCAN_TOTE_BARCODE).
        const activeSlot = activeToteSlot ?? session.currentToteSlot
        const isCurrent = slotNum === activeSlot
        const isHighlighted = effectiveHighlight === tote.barcode
        const canScan = scannableAsset === "tote" && isCurrent
        // All totes are loaded once we reach BC_PRESS_CTRL_E or pick phase.
        // During build cart, only slots before the current one are fully loaded.
        const inPickPhase =
          session.currentStep.startsWith("PK_") ||
          session.currentStep.startsWith("PS_")
        const isLoaded =
          inPickPhase ||
          tote.barcode.length > 0 ||
          session.currentStep === WorkflowStep.BC_PRESS_CTRL_E

        return (
          <PickTote
            key={tote.toteId}
            toteBarcode={tote.barcode}
            slotNumber={slotNum}
            itemCount={tote.pickedItems.length}
            scannable={canScan}
            highlighted={isHighlighted}
            isLoaded={isLoaded}
            difficulty={difficulty}
            onScan={onScan}
          />
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM ACTION BAR — for physical steps (travel, verify, place)
// ─────────────────────────────────────────────────────────────────────────────

const CONFIRM_STEPS = new Set<WorkflowStep>([
  WorkflowStep.PK_READ_PICK_DISPLAY,
  WorkflowStep.PK_TRAVEL_TO_LOCATION,
  WorkflowStep.PK_VERIFY_LOCATION,
  WorkflowStep.PK_VERIFY_ITEM,
  WorkflowStep.PK_PICK_QUANTITY,
  WorkflowStep.PK_PLACE_IN_TOTE,
  WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
  WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
])

function isConfirmPhysicalStep(step: WorkflowStep): boolean {
  return CONFIRM_STEPS.has(step)
}

function ConfirmActionBar({
  step,
  session,
  onConfirm,
}: {
  step: WorkflowStep
  session: SimulationSession
  onConfirm: () => void
}) {
  const pick = session.pickQueue[session.currentPickIndex]

  const labels: Record<string, string> = {
    [WorkflowStep.PK_READ_PICK_DISPLAY]: "Read pick details → Continue",
    [WorkflowStep.PK_TRAVEL_TO_LOCATION]: `Travel to ${pick?.location.displayLabel ?? "location"} → Continue`,
    [WorkflowStep.PK_VERIFY_LOCATION]: `Verify location: ${pick?.location.displayLabel ?? ""} → Continue`,
    [WorkflowStep.PK_VERIFY_ITEM]: `Verify item: ${pick?.item.description ?? ""} → Continue`,
    [WorkflowStep.PK_PICK_QUANTITY]: `Pick ${pick?.quantityRequired ?? 1} × ${pick?.item.unitOfMeasure ?? "Unit"} → Continue`,
    [WorkflowStep.PK_PLACE_IN_TOTE]: `Place in tote S${pick?.targetSlot ?? 1} → Continue`,
    [WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR]: "Place tote on conveyor → Continue",
    [WorkflowStep.BC_PLACE_TOTE_IN_SLOT]: `Place tote in slot ${session.currentToteSlot} → Continue`,
  }

  return (
    <button
      onClick={onConfirm}
      className="w-full bg-slate-600 hover:bg-slate-500 text-white text-xs font-mono font-medium px-4 py-2 rounded-lg transition-colors"
    >
      {labels[step] ?? "Continue"}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEPTION BANNER
// Per BBWD-WI-030 §6: Exception handling overlay
// ─────────────────────────────────────────────────────────────────────────────

function ExceptionBanner({ step, onConfirm }: { step: WorkflowStep; onConfirm: () => void }) {
  const configs: Record<string, { title: string; subtitle: string; color: string }> = {
    [WorkflowStep.EX_TOTE_ALREADY_ALLOCATED]: { title: "Tote Already Allocated", subtitle: "Set aside, contact Lead", color: "#ef4444" },
    [WorkflowStep.EX_CART_ALREADY_CREATED]: { title: "Cart Already Created", subtitle: "Set aside, contact Lead", color: "#ef4444" },
    [WorkflowStep.EX_INCORRECT_LOCATION]: { title: "Incorrect Location", subtitle: "Press CTRL+W to go back", color: "#f97316" },
    [WorkflowStep.EX_PRESS_CTRL_W]: { title: "Go Back", subtitle: "Press CTRL+W on RF Device", color: "#f97316" },
    [WorkflowStep.EX_INCORRECT_TOTE]: { title: "Incorrect Tote", subtitle: "Press CTRL+W to go back", color: "#f97316" },
    [WorkflowStep.EX_INVALID_ITEM_LAST]: { title: "Invalid Item (Last)", subtitle: "Notify Lead → CTRL+K → Amnesty Bin", color: "#ef4444" },
    [WorkflowStep.EX_INVALID_ITEM_NOT_LAST]: { title: "Invalid Item", subtitle: "Notify Lead → Putwall → IC", color: "#ef4444" },
    [WorkflowStep.EX_SHORT_INVENTORY]: { title: "Short Inventory", subtitle: "Verify → Notify Lead → CTRL+K", color: "#eab308" },
    [WorkflowStep.EX_DAMAGED_ITEM]: { title: "Damaged Item", subtitle: "Amnesty Bin (ziplock if leaking)", color: "#ef4444" },
    [WorkflowStep.EX_NOTIFY_LEAD]: { title: "Notify Lead", subtitle: "Confirm when acknowledged", color: "#3b82f6" },
    [WorkflowStep.EX_PRESS_CTRL_K]: { title: "Skip Pick", subtitle: "Press CTRL+K on RF Device", color: "#f97316" },
    [WorkflowStep.EX_ITEM_TO_AMNESTY_BIN]: { title: "Item → Amnesty Bin", subtitle: "Confirm when done", color: "#ef4444" },
    [WorkflowStep.EX_ITEM_TO_IC]: { title: "Item → IC", subtitle: "Confirm when done", color: "#3b82f6" },
  }

  const cfg = configs[step] ?? { title: "Exception", subtitle: "Follow RF Device", color: "#6b7280" }

  const confirmSteps = new Set([
    WorkflowStep.EX_NOTIFY_LEAD,
    WorkflowStep.EX_ITEM_TO_AMNESTY_BIN,
    WorkflowStep.EX_ITEM_TO_IC,
    WorkflowStep.EX_TOTE_ALREADY_ALLOCATED,
    WorkflowStep.EX_CART_ALREADY_CREATED,
    WorkflowStep.EX_SHORT_INVENTORY,
    WorkflowStep.EX_DAMAGED_ITEM,
  ])

  return (
    <div
      className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
      style={{
        backgroundColor: `${cfg.color}15`,
        border: `1px solid ${cfg.color}40`,
      }}
    >
      <div>
        <div className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.title}</div>
        <div className="text-[10px] text-slate-500">{cfg.subtitle}</div>
      </div>
      {confirmSteps.has(step) && (
        <button
          onClick={onConfirm}
          className="text-[10px] font-mono font-medium px-3 py-1 rounded border transition-colors"
          style={{
            borderColor: `${cfg.color}60`,
            color: cfg.color,
            backgroundColor: `${cfg.color}10`,
          }}
        >
          Done
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-ROUND OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function PostRoundOverlay({ session }: { session: SimulationSession }) {
  if (session.currentStep === WorkflowStep.PS_ROUND_COMPLETE) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🎉</span>
        </div>
        <div className="text-green-800 text-sm font-bold">Round Complete</div>
        <div className="text-slate-500 text-[10px] font-mono">
          {session.completedPicks.length} picks completed
        </div>
      </div>
    )
  }
  return (
    <div className="text-slate-400 text-xs font-mono text-center">
      Completing round…
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER — step instruction hint
// ─────────────────────────────────────────────────────────────────────────────

function Footer({
  step,
  difficulty,
  scannableAsset,
}: {
  step: WorkflowStep
  difficulty: DifficultyLevel
  scannableAsset: string | null
}) {
  let hint = humanizeStep(step)

  if (difficulty === DifficultyLevel.BEGINNER && scannableAsset) {
    hint = `Scan the highlighted ${scannableAsset} to continue`
  }

  return (
    <div className="text-slate-400 text-[10px] font-mono text-center truncate">
      {hint}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/** Simple deterministic hash for shuffling decoy items. */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
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
