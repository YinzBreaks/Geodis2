"use client"

/**
 * ScanBarcode — Realistic scanner simulation widget (Overhaul 2A)
 *
 * Renders a real-looking barcode (via the deterministic SVG generator in
 * barcode-utils) with a red laser-line sweep on scan, a green/red border
 * flash for success/error feedback, and a synthesized beep/buzz.
 *
 * Interaction modes (Overhaul 2A):
 *   - "click"  Click the barcode / Scan button → 300 ms laser → onScan(value)
 *   - "type"   Manual keyboard entry of the barcode value
 *   - "auto"   Auto-scans after a 1.5 s delay (walkthrough / demo)
 *
 * Pure presentation + local animation state. All correctness lives in the
 * engine — this component only reports the scanned value upward via onScan.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { generateBarcodeSVG } from "@/data/barcode-utils"
import { sounds } from "@/lib/audio"

export type ScanMode = "click" | "type" | "auto"

export interface ScanBarcodeProps {
  /** The barcode value to render and (when scanned) report upward. */
  value: string
  /** Called with the scanned value once the laser animation completes. */
  onScan: (value: string) => void
  /** Interaction mode (default "click"). */
  mode?: ScanMode
  /**
   * Feedback from the parent after a scan was evaluated by the engine.
   * Drives the success/error border flash. Reset to null to clear.
   */
  feedback?: "success" | "error" | null
  /** Human label shown above the barcode (e.g. "Scan Pick Tote"). */
  label?: string
  /** Disable interaction (e.g. while a different step is active). */
  disabled?: boolean
}

const LASER_MS = 300
const AUTO_DELAY_MS = 1500

export function ScanBarcode({
  value,
  onScan,
  mode = "click",
  feedback = null,
  label,
  disabled = false,
}: ScanBarcodeProps) {
  const [scanning, setScanning] = useState(false)
  const [typed, setTyped] = useState("")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fire = useCallback(
    (scannedValue: string) => {
      if (disabled || scanning) return
      setScanning(true)
      sounds.scanSuccess()
      timerRef.current = setTimeout(() => {
        setScanning(false)
        onScan(scannedValue)
      }, LASER_MS)
    },
    [disabled, scanning, onScan]
  )

  // Auto-scan mode: fire once after a delay when the value changes.
  useEffect(() => {
    if (mode !== "auto" || disabled) return
    const t = setTimeout(() => fire(value), AUTO_DELAY_MS)
    return () => clearTimeout(t)
  }, [mode, value, disabled, fire])

  // Error feedback plays the buzz tone.
  useEffect(() => {
    if (feedback === "error") sounds.scanError()
  }, [feedback])

  // Cleanup pending laser timer on unmount.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const flashClass =
    feedback === "success"
      ? "flash-success"
      : feedback === "error"
        ? "flash-error error-shake"
        : ""

  const svg = generateBarcodeSVG(value, 240, 72)
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {label && (
        <span
          className="text-xs uppercase tracking-wider"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-text-secondary)" }}
        >
          {label}
        </span>
      )}

      <div
        className={`relative rounded-md overflow-hidden ${flashClass}`}
        style={{
          padding: 6,
          background: "var(--ice-white)",
          border: "1px solid var(--color-border)",
          cursor: mode === "click" && !disabled ? "pointer" : "default",
          opacity: disabled ? 0.5 : 1,
        }}
        onClick={mode === "click" ? () => fire(value) : undefined}
        role={mode === "click" ? "button" : undefined}
        aria-label={mode === "click" ? `Scan barcode ${value}` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`Barcode ${value}`} width={240} height={72} draggable={false} />
        <div className={`scan-laser ${scanning ? "scanning" : ""}`} />
      </div>

      {mode === "click" && (
        <button
          type="button"
          disabled={disabled || scanning}
          onClick={() => fire(value)}
          className="px-4 py-1.5 rounded text-sm font-semibold transition-colors disabled:opacity-50"
          style={{
            background: "var(--ice-blue)",
            color: "var(--navy)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
          }}
        >
          {scanning ? "SCANNING…" : "SCAN"}
        </button>
      )}

      {mode === "type" && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (typed.trim()) {
              onScan(typed.trim())
              setTyped("")
            }
          }}
          className="flex gap-2 w-full max-w-[260px]"
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={disabled}
            placeholder="Type barcode…"
            className="flex-1 px-2 py-1.5 rounded text-sm"
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              fontFamily: "var(--font-terminal)",
            }}
          />
          <button
            type="submit"
            disabled={disabled}
            className="px-3 py-1.5 rounded text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--ice-blue)", color: "var(--navy)" }}
          >
            ↵
          </button>
        </form>
      )}
    </div>
  )
}
