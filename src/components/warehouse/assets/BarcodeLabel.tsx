/**
 * BarcodeLabel — Reusable scannable barcode label component
 *
 * Renders a visual barcode (decorative bars + value text) that the trainee
 * clicks to "scan". A 250ms delay simulates the real scan gun beam before
 * the barcode value is submitted to the engine.
 *
 * Per CLAUDE.md §Code Standards: no external barcode libraries.
 * Bars are purely decorative — varying width vertical lines generated
 * deterministically from the barcode string.
 */
"use client"

import { useState, useCallback, useRef } from "react"
import type { DifficultyLevel } from "@/types/domain"

/** Scan gun delay in milliseconds — matches real RF device scan latency. */
export const SCAN_DELAY_MS = 250

interface BarcodeLabelProps {
  /** The barcode string to display and scan */
  value: string
  /** Whether this label can be clicked/scanned right now */
  scannable: boolean
  /** Difficulty — drives highlight intensity */
  difficulty?: DifficultyLevel
  /** Called with the barcode value after the 250ms scan delay */
  onScan: (value: string) => void
}

/**
 * Generate a deterministic bar pattern from a barcode string.
 * Returns an array of booleans — true = black bar, false = gap.
 * Same input always produces the same pattern.
 */
function valueToBars(value: string): boolean[] {
  const bars: boolean[] = []
  const len = Math.max(value.length * 4, 40)
  let seed = 0
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) | 0
  }
  for (let i = 0; i < len; i++) {
    seed = (seed * 1103515245 + 12345) | 0
    // Bias toward bars (60% black) for realistic density
    bars.push(((seed >>> 16) & 0x7fff) % 10 < 6)
  }
  // Always start and end with a bar (quiet zone markers)
  bars[0] = true
  bars[1] = true
  bars[len - 1] = true
  bars[len - 2] = true
  return bars
}

export function BarcodeLabel({ value, scannable, difficulty, onScan }: BarcodeLabelProps) {
  const [scanning, setScanning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = useCallback(() => {
    if (!scannable || scanning || !value) return

    setScanning(true)
    timerRef.current = setTimeout(() => {
      setScanning(false)
      onScan(value)
    }, SCAN_DELAY_MS)
  }, [scannable, scanning, value, onScan])

  const bars = valueToBars(value)
  const barWidth = 100 / bars.length

  return (
    <div
      onClick={handleClick}
      role={scannable ? "button" : undefined}
      tabIndex={scannable ? 0 : undefined}
      aria-label={scannable ? `Scan barcode ${value}` : undefined}
      onKeyDown={scannable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick() } } : undefined}
      className="relative select-none"
      style={{
        cursor: scannable ? "crosshair" : "default",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4px 6px",
        backgroundColor: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: 3,
        transition: "box-shadow 0.2s, transform 0.15s",
        boxShadow: scannable && !scanning
          ? "0 0 0 1px rgba(240, 165, 0, 0.15)"
          : scanning
            ? "0 0 12px rgba(240, 165, 0, 0.5)"
            : "none",
        transform: scanning ? "scale(1.02)" : "scale(1)",
      }}
    >
      {/* Barcode bars — purely decorative SVG */}
      <svg
        viewBox={`0 0 100 28`}
        style={{ width: "100%", height: 28, display: "block" }}
        aria-hidden="true"
      >
        {bars.map((isBar, i) =>
          isBar ? (
            <rect
              key={i}
              x={i * barWidth}
              y={0}
              width={barWidth}
              height={28}
              fill="#000"
            />
          ) : null
        )}
      </svg>

      {/* Barcode value text */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 9,
          color: "#374151",
          letterSpacing: "0.05em",
          marginTop: 2,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>

      {/* Scan beam animation — amber sweep line during 250ms delay */}
      {scanning && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            borderRadius: 3,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-10%",
              width: "20%",
              height: "100%",
              background: "linear-gradient(90deg, transparent, rgba(240, 165, 0, 0.5), transparent)",
              animation: "barcodeSweep 250ms linear forwards",
            }}
          />
        </div>
      )}
    </div>
  )
}

/**
 * CSS keyframes for the scan beam sweep — injected once via a <style> tag.
 * The amber line sweeps left → right during the 250ms scan delay.
 */
export function BarcodeScanStyles() {
  return (
    <style>{`
      @keyframes barcodeSweep {
        from { left: -20%; }
        to   { left: 100%; }
      }
      @keyframes assetPulse {
        0%, 100% { box-shadow: 0 0 8px rgba(240, 165, 0, 0.3); }
        50%      { box-shadow: 0 0 16px rgba(240, 165, 0, 0.6); }
      }
      @keyframes floorFlash {
        0%   { outline: 3px solid rgba(240, 165, 0, 0); }
        30%  { outline: 3px solid rgba(240, 165, 0, 0.8); }
        100% { outline: 3px solid rgba(240, 165, 0, 0); }
      }
      .floor-flash {
        animation: floorFlash 0.9s ease-out forwards;
        border-radius: 12px;
      }
    `}</style>
  )
}
