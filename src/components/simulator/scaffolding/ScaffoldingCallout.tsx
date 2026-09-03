"use client"

import React from "react"

export interface ScaffoldingCalloutProps {
  beat: 1 | 2 | 3 | 4
  checkDigit?: string
  quantity?: number
  targetSlot?: number
  targetToteId?: string
}

export function ScaffoldingCallout({
  beat,
  checkDigit = "47",
  quantity = 1,
  targetSlot = 1,
  targetToteId = "TOTE-01",
}: ScaffoldingCalloutProps) {
  if (beat === 1) {
    return (
      <div
        data-testid="scaffolding-callout-beat-1"
        className="pointer-events-none absolute -bottom-14 right-0 z-50 flex items-center gap-2 bg-[#1A1608] border-2 border-amber-400 rounded-lg px-3 py-2 text-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.4)] max-w-sm animate-bounce"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#F59E0B]" />
        <div className="text-[11px] font-mono leading-tight">
          <strong className="text-amber-300 uppercase block font-black tracking-wide">
            STEP 1: CONFIRM LOCATION
          </strong>
          Look at shelf beam. Scan or enter check-digit{" "}
          <strong className="text-amber-100 font-bold">[{checkDigit}]</strong> to verify you
          are at the correct rack bay before touching product.
        </div>
      </div>
    )
  }

  if (beat === 2) {
    return (
      <div
        data-testid="scaffolding-callout-beat-2"
        className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#061824] border-2 border-cyan-400 rounded-lg px-3 py-2 text-cyan-200 shadow-[0_4px_20px_rgba(56,189,248,0.4)] max-w-sm animate-pulse"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#38BDF8]" />
        <div className="text-[11px] font-mono leading-tight">
          <strong className="text-cyan-300 uppercase block font-black tracking-wide">
            STEP 2: VERIFY SKU
          </strong>
          Scan the manufacturer UPC on the carton. This confirms item matches the pick list.
        </div>
      </div>
    )
  }

  if (beat === 3) {
    return (
      <div
        data-testid="scaffolding-callout-beat-3"
        className="pointer-events-none absolute -top-12 right-2 z-50 flex items-center gap-2 bg-[#1C1805] border-2 border-amber-400 rounded-lg px-3 py-2 text-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.4)] max-w-xs animate-pulse"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-[0_0_8px_#F59E0B]" />
        <div className="text-[11px] font-mono leading-tight">
          <strong className="text-amber-300 uppercase block font-black tracking-wide">
            STEP 3: CONFIRM QUANTITY
          </strong>
          Check pick qty ({quantity}). Press &apos;{quantity}&apos; then [ENTER] on the terminal keypad.
        </div>
      </div>
    )
  }

  if (beat === 4) {
    return (
      <div
        data-testid="scaffolding-callout-beat-4"
        className="pointer-events-none absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-[#071F15] border-2 border-emerald-400 rounded-lg px-3 py-2 text-emerald-200 shadow-[0_4px_20px_rgba(16,185,129,0.4)] max-w-sm animate-pulse"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#10B981]" />
        <div className="text-[11px] font-mono leading-tight">
          <strong className="text-emerald-300 uppercase block font-black tracking-wide">
            STEP 4: DEPOSIT TO TOTE
          </strong>
          Place item into designated batch tote (Slot {targetSlot} / {targetToteId}). Scan tote barcode or confirm slot to close pick beat.
        </div>
      </div>
    )
  }

  return null
}
