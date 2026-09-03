"use client"

import React from "react"

export interface IdleHintBannerProps {
  visible: boolean
  beat: 1 | 2 | 3 | 4
  checkDigit?: string
  quantity?: number
  targetSlot?: number
}

export function IdleHintBanner({
  visible,
  beat,
  checkDigit = "47",
  quantity = 1,
  targetSlot = 1,
}: IdleHintBannerProps) {
  if (!visible) return null

  const getHint = () => {
    switch (beat) {
      case 1:
        return `Need guidance? Tap or scan the flashing shelf check-digit [${checkDigit}] on the beam.`
      case 2:
        return "Need guidance? Tap or scan the product barcode on the carton box."
      case 3:
        return `Need guidance? Enter '${quantity}' on the chiclet keypad and press ENTER.`
      case 4:
        return `Need guidance? Deposit into Cart Slot ${targetSlot} by clicking the highlighted tote.`
      default:
        return "Follow the highlighted element on screen to proceed."
    }
  }

  return (
    <div
      data-testid="idle-hint-banner"
      className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#121A24]/95 border-2 border-cyan-500/80 rounded-xl px-4 py-2 text-cyan-200 shadow-[0_4px_25px_rgba(6,182,212,0.4)] animate-pulse"
    >
      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_10px_#22D3EE] animate-ping" />
      <span className="text-xs font-mono font-bold leading-tight tracking-wide">
        {getHint()}
      </span>
    </div>
  )
}
