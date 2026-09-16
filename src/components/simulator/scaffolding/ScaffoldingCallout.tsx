"use client"

import React from "react"

export interface ScaffoldingCalloutProps {
  beat: 1 | 2 | 3 | 4
  checkDigit?: string
  quantity?: number
  targetSlot?: number
  targetToteId?: string
  /**
   * Beat 4 only: which column of the 3×3 tote grid the target slot lives in.
   * The cockpit renders the Beat 4 callout in a dock row that mirrors the
   * grid's columns, so this pins it directly above the target slot's column
   * without ever overlapping a neighbouring slot button.
   */
  dockColumn?: 1 | 2 | 3
}

/** Static class names so Tailwind's JIT can see every variant. */
const DOCK_COLUMN_CLASS: Record<1 | 2 | 3, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
}

/**
 * ScaffoldingCallout — in-situ guidance card for one beat of the 4-beat cycle.
 *
 * Every callout renders in normal document flow inside a bounded parent — no
 * absolute positioning, no negative offsets, no translates — so it can never
 * escape its container or cover the equipment it describes. The root and all
 * descendants are `pointer-events-none`: a callout may never intercept a tap
 * intended for the shelf plate, carton barcode, tote slot, or terminal.
 */
export function ScaffoldingCallout({
  beat,
  checkDigit = "47",
  quantity = 1,
  targetSlot = 1,
  targetToteId = "TOTE-01",
  dockColumn,
}: ScaffoldingCalloutProps) {
  if (beat === 1) {
    return (
      <div
        data-testid="scaffolding-callout-beat-1"
        className="pointer-events-none w-full max-w-md flex items-center gap-2 bg-[#1A1608]/95 border border-amber-400/90 rounded-md px-3 py-1.5 text-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.35)] animate-pulse overflow-hidden"
      >
        <span className="pointer-events-none w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#F59E0B]" />
        <div className="pointer-events-none text-[11px] font-mono leading-tight">
          <strong className="pointer-events-none text-amber-300 uppercase font-black mr-1">
            STEP 1: CONFIRM LOCATION
          </strong>
          . Tap <strong className="pointer-events-none text-amber-100 font-bold">[{checkDigit}]</strong> or key {checkDigit} + ENTER on terminal.
        </div>
      </div>
    )
  }

  if (beat === 2) {
    return (
      <div
        data-testid="scaffolding-callout-beat-2"
        className="pointer-events-none w-full max-w-md flex items-center gap-2 bg-[#061824]/95 border border-cyan-400/90 rounded-md px-3 py-1.5 text-cyan-200 shadow-[0_2px_12px_rgba(56,189,248,0.35)] animate-pulse overflow-hidden"
      >
        <span className="pointer-events-none w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#38BDF8]" />
        <div className="pointer-events-none text-[11px] font-mono leading-tight">
          <strong className="pointer-events-none text-cyan-300 uppercase font-black mr-1">
            STEP 2: VERIFY SKU
          </strong>
          . Scan the manufacturer UPC on the carton. This confirms item matches the pick list.
        </div>
      </div>
    )
  }

  if (beat === 3) {
    return (
      <div
        data-testid="scaffolding-callout-beat-3"
        className="pointer-events-none w-full max-w-sm flex items-center gap-2 bg-[#1C1805]/95 border border-amber-400/90 rounded-md px-3 py-1 text-amber-200 shadow-[0_2px_12px_rgba(245,158,11,0.35)] animate-pulse overflow-hidden"
      >
        <span className="pointer-events-none w-2 h-2 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#F59E0B]" />
        <div className="pointer-events-none text-[11px] font-mono leading-tight">
          <strong className="pointer-events-none text-amber-300 uppercase font-black mr-1">
            STEP 3: CONFIRM QUANTITY
          </strong>
          . Check pick qty ({quantity}). Press &apos;{quantity}&apos; then [ENTER] on the terminal keypad.
        </div>
      </div>
    )
  }

  if (beat === 4) {
    const dockClass = dockColumn ? DOCK_COLUMN_CLASS[dockColumn] : ""
    return (
      <div
        data-testid="scaffolding-callout-beat-4"
        className={`pointer-events-none min-w-0 flex flex-col items-center ${dockClass}`}
      >
        <div className="pointer-events-none w-full flex items-start gap-2 bg-[#071F15]/95 border border-emerald-400/90 rounded-md px-2.5 py-1 text-emerald-200 shadow-[0_2px_12px_rgba(16,185,129,0.35)] animate-pulse overflow-hidden">
          <span className="pointer-events-none w-2 h-2 mt-0.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#10B981]" />
          <div className="pointer-events-none text-[10px] font-mono leading-tight">
            <strong className="pointer-events-none text-emerald-300 uppercase font-black mr-1">
              STEP 4: DEPOSIT TO TOTE
            </strong>
            . Place item into designated batch tote (Slot {targetSlot} / {targetToteId}). Scan tote barcode or confirm slot to close pick beat.
          </div>
        </div>
        {/* Dock pointer: points down at the target slot's column in the grid below. */}
        <span
          aria-hidden="true"
          className="pointer-events-none text-emerald-400 text-[10px] leading-none -mb-px"
        >
          ▼
        </span>
      </div>
    )
  }

  return null
}
