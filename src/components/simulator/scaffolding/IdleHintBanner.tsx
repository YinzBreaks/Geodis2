"use client"

import React from "react"

export interface IdleHintBannerProps {
  visible: boolean
  beat: 1 | 2 | 3 | 4
  checkDigit?: string
  quantity?: number
  targetSlot?: number
}

/**
 * IdleHintBanner — contextual nudge shown after >6s of trainee inactivity.
 *
 * Renders as a normal-flow status strip, NOT a floating overlay. The cockpit
 * docks it in a reserved slot directly above the 4-Beat Cadence footer, so it
 * can never sit on top of the 9-tote cart or any other equipment. It carries
 * `pointer-events-none` end to end so it can never intercept a tap either.
 */
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
      role="status"
      aria-live="polite"
      className="pointer-events-none w-full h-full flex items-center justify-center gap-2.5 bg-[#121A24]/95 border border-cyan-500/70 rounded-lg px-3 text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.25)] overflow-hidden"
    >
      <span className="pointer-events-none w-2 h-2 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_8px_#22D3EE] animate-ping" />
      <span className="pointer-events-none text-[11px] font-mono font-bold leading-tight tracking-wide truncate">
        {getHint()}
      </span>
    </div>
  )
}
