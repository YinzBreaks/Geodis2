"use client"

import React, { useState, useEffect } from "react"

export interface HardwareScannerPillProps {
  onTriggerScan?: () => void
  compact?: boolean
}

export function HardwareScannerPill({
  onTriggerScan,
  compact = false,
}: HardwareScannerPillProps) {
  const [isHardwareActive, setIsHardwareActive] = useState(true)
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState<number>(0)

  // Listen for rapid keystrokes (< 35ms) typical of hardware HID ring scanners (Zebra RS5100 / Honeywell 8675i)
  useEffect(() => {
    let prevTime = 0
    const handleKeyDown = () => {
      const now = performance.now()
      const delta = now - prevTime
      prevTime = now
      if (delta > 0 && delta < 45) {
        setIsHardwareActive(true)
        setLastKeystrokeTime(now)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsHardwareActive((prev) => !prev)}
        title="Toggle Hardware Ring Scanner (HID Wedge) vs Optical Reticle Mode"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
          isHardwareActive
            ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950"
            : "bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isHardwareActive
              ? "bg-emerald-400 animate-pulse"
              : "bg-amber-400"
          }`}
        />
        {isHardwareActive ? (
          <span>{compact ? "HID WEDGE" : "● HARDWARE SCANNER ACTIVE (HID WEDGE)"}</span>
        ) : (
          <span>{compact ? "OPTICAL RETICLE" : "⌖ OPTICAL RETICLE MODE"}</span>
        )}
      </button>

      {/* When optical reticle mode is active, render glove-friendly software trigger */}
      {!isHardwareActive && onTriggerScan && (
        <button
          type="button"
          onClick={onTriggerScan}
          className="glove-target-primary px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span>⌖</span> PULL TRIGGER
        </button>
      )}
    </div>
  )
}
