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

import { WorkflowStep, DifficultyLevel, type SimulationSession } from "@/types/domain"
import { getAssetContext } from "@/lib/assetContext"
import { BarcodeLabel, BarcodeScanStyles } from "./assets/BarcodeLabel"
import dynamic from "next/dynamic"

const WarehouseScene3D = dynamic(
  () => import("./3d/WarehouseScene3D").then((mod) => mod.WarehouseScene3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-mono text-xs rounded-xl">
        Loading 3D…
      </div>
    ),
  }
)

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
  const pick = session.pickQueue[session.currentPickIndex]

  // Difficulty-aware highlighting: ADVANCED never highlights
  const effectiveHighlight = difficulty === DifficultyLevel.ADVANCED
    ? null
    : ctx.highlightedBarcode

  return (
    <div id="warehouse-floor" className="bg-slate-100 rounded-xl border border-slate-300 p-4 h-full flex flex-col gap-3 overflow-y-auto overflow-x-hidden">
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
      <div className="flex-1 min-h-0 w-full relative">
        {ctx.scannableAsset === "zone" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <ZoneCard
              zone={session.cart.taskGroup}
              scannable={true}
              highlighted={effectiveHighlight === session.cart.taskGroup}
              difficulty={difficulty}
              onScan={onScan}
            />
          </div>
        ) : (!ctx.showCart && !ctx.showShelf ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
            <PostRoundOverlay session={session} />
          </div>
        ) : (
          <WarehouseScene3D 
            session={session} 
            difficulty={difficulty} 
            onScan={onScan} 
            onConfirm={onConfirm}
          />
        ))}
      </div>

      {/* Always-visible scan targets panel — clear fallback if 3D hit targets fail. */}
      {(ctx.showCart || ctx.showShelf) && ctx.scannableAsset !== "zone" && (
        <FallbackScanPanel
          session={session}
          scannableAsset={ctx.scannableAsset}
          activeToteSlot={ctx.activeToteSlot ?? null}
          onScan={onScan}
          pickItemBarcode={pick?.item.upcBarcode ?? null}
          pickLocationLabel={pick?.location.displayLabel ?? null}
          showCart={ctx.showCart}
          showTotes={ctx.showTotes}
          showShelf={ctx.showShelf}
        />
      )}

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

function FallbackScanPanel({
  session,
  scannableAsset,
  activeToteSlot,
  onScan,
  pickItemBarcode,
  pickLocationLabel,
  showCart,
  showTotes,
  showShelf,
}: {
  session: SimulationSession
  scannableAsset: "cart" | "tote" | "location" | "item" | null
  activeToteSlot: number | null
  onScan: (barcode: string) => void
  pickItemBarcode: string | null
  pickLocationLabel: string | null
  showCart: boolean
  showTotes: boolean
  showShelf: boolean
}) {
  const isCartStep = scannableAsset === "cart"
  const isItemStep = scannableAsset === "item"
  const isLocationStep = scannableAsset === "location"
  const isToteStep = scannableAsset === "tote"
  const targetSlot = activeToteSlot ?? session.currentToteSlot

  return (
    <div className="rounded-md border border-slate-500/50 bg-slate-900/70 p-2 flex flex-col gap-2 max-h-44 overflow-y-auto">
      <div className="text-[10px] font-mono text-slate-300 uppercase tracking-wide">Scan Targets</div>

      {showCart && (
        <button
          onClick={() => isCartStep && onScan(session.cart.cartBarcode)}
          disabled={!isCartStep}
          data-scan-target={isCartStep ? "active" : "inactive"}
          data-scan-type="cart"
          className={`w-full rounded-md px-3 py-1.5 text-xs font-mono font-semibold border transition-colors ${
            isCartStep
              ? "border-amber-400/70 bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
              : "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Cart · {session.cart.cartBarcode}
        </button>
      )}

      {showShelf && pickLocationLabel && (
        <button
          onClick={() => isLocationStep && onScan(pickLocationLabel)}
          disabled={!isLocationStep}
          data-scan-target={isLocationStep ? "active" : "inactive"}
          data-scan-type="location"
          className={`w-full rounded-md px-3 py-1.5 text-xs font-mono font-semibold border transition-colors ${
            isLocationStep
              ? "border-amber-400/70 bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
              : "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Location · {pickLocationLabel}
        </button>
      )}

      {showShelf && pickItemBarcode && (
        <button
          onClick={() => isItemStep && onScan(pickItemBarcode)}
          disabled={!isItemStep}
          data-scan-target={isItemStep ? "active" : "inactive"}
          data-scan-type="item"
          className={`w-full rounded-md px-3 py-1.5 text-xs font-mono font-semibold border transition-colors ${
            isItemStep
              ? "border-amber-400/70 bg-amber-300/20 text-amber-100 hover:bg-amber-300/30"
              : "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Item UPC · {pickItemBarcode}
        </button>
      )}

      {showTotes && (
        <div className="grid grid-cols-3 gap-1.5">
          {session.cart.totes.map((tote) => {
            const isTarget = isToteStep && tote.slot === targetSlot
            return (
              <button
                key={tote.toteId}
                onClick={() => isTarget && onScan(tote.barcode)}
                disabled={!isTarget}
                data-scan-target={isTarget ? "active" : "inactive"}
                data-scan-type="tote"
                data-scan-slot={String(tote.slot)}
                className={`rounded px-2 py-1.5 text-[10px] font-mono border transition-colors ${
                  isTarget
                    ? "border-amber-400/80 bg-amber-300/25 text-amber-100 hover:bg-amber-300/35"
                    : "border-slate-600 bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                S{tote.slot} · {tote.barcode.slice(-4)}
              </button>
            )
          })}
        </div>
      )}
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

/** Human-readable step name for the footer. */
function humanizeStep(step: WorkflowStep): string {
  return step
    .replace(/^(BC_|PK_|PS_|EX_)/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase())
}
