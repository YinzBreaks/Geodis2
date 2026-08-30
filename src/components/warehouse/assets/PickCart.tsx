/**
 * PickCart — Warehouse picking cart SVG component
 *
 * Renders a steel-gray rectangular cart frame with 4 wheels, a scannable
 * barcode label, and 3 visible tote slots. Used during Build Cart phase.
 *
 * Per CLAUDE.md §Canonical Domain Vocabulary: Cart holds 9 totes.
 * Per BBWD-WI-030 §5.1: Build Cart procedure.
 */
"use client"

import { BarcodeLabel } from "./BarcodeLabel"
import { DifficultyLevel } from "@/types/domain"

interface PickCartProps {
  /** Cart barcode value, e.g. "C000000083" */
  cartBarcode: string
  /** Whether the barcode label can be clicked to scan */
  scannable: boolean
  /** Whether to show the highlight glow (difficulty-aware) */
  highlighted: boolean
  /** Training difficulty — drives highlight intensity */
  difficulty: DifficultyLevel
  /** Called with barcode value after scan delay */
  onScan: (barcode: string) => void
  /** Optional children rendered inside the cart (tote components) */
  children?: React.ReactNode
}

/**
 * Get highlight style based on difficulty level.
 * BEGINNER: bright amber pulse. INTERMEDIATE: subtle glow. ADVANCED: none.
 */
function getHighlightStyle(highlighted: boolean, difficulty: DifficultyLevel): React.CSSProperties {
  if (!highlighted || difficulty === DifficultyLevel.ADVANCED) return {}
  if (difficulty === DifficultyLevel.BEGINNER) {
    return {
      boxShadow: "0 0 16px rgba(240, 165, 0, 0.6)",
      animation: "assetPulse 1.5s ease-in-out infinite",
    }
  }
  // INTERMEDIATE
  return {
    boxShadow: "0 0 6px rgba(240, 165, 0, 0.25)",
  }
}

export function PickCart({
  cartBarcode,
  scannable,
  highlighted,
  difficulty,
  onScan,
  children,
}: PickCartProps) {
  const highlightStyle = getHighlightStyle(highlighted, difficulty)

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        ...highlightStyle,
        borderRadius: 8,
        padding: 8,
        transition: "box-shadow 0.3s",
      }}
    >
      <svg
        viewBox="0 0 200 160"
        style={{
          width: 200,
          height: 160,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
          cursor: scannable ? "pointer" : "default",
        }}
        onClick={scannable ? () => onScan(cartBarcode) : undefined}
        aria-label="Pick Cart"
      >
        <defs>
          {/* Steel pipe chrome gradient */}
          <linearGradient id="steelPipe" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="35%" stopColor="#f1f5f9" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Heavy caster wheel hub gradient */}
          <radialGradient id="wheelHub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>
        </defs>

        {/* Wheels shadow */}
        <ellipse cx="30" cy="147" rx="14" ry="4" fill="#000" opacity="0.2" />
        <ellipse cx="170" cy="147" rx="14" ry="4" fill="#000" opacity="0.2" />

        {/* Left Caster Wheel Structure */}
        <rect x="25" y="128" width="10" height="12" fill="#475569" rx="1" /> {/* Caster Fork */}
        <circle cx="30" cy="140" r="10" fill="#1e293b" /> {/* Tire */}
        <circle cx="30" cy="140" r="5" fill="url(#wheelHub)" /> {/* Hub */}
        <circle cx="30" cy="140" r="1.5" fill="#0f172a" />

        {/* Right Caster Wheel Structure */}
        <rect x="165" y="128" width="10" height="12" fill="#475569" rx="1" />
        <circle cx="170" cy="140" r="10" fill="#1e293b" />
        <circle cx="170" cy="140" r="5" fill="url(#wheelHub)" />
        <circle cx="170" cy="140" r="1.5" fill="#0f172a" />

        {/* Cart body — robust steel frame pipes */}
        <rect x="10" y="10" width="180" height="120" rx="6"
          fill="none" stroke="url(#steelPipe)" strokeWidth="4" />

        {/* Bottom rubber bumper corners (protects shelves in real warehouses) */}
        <rect x="6" y="122" width="12" height="10" rx="2" fill="#0f172a" />
        <rect x="182" y="122" width="12" height="10" rx="2" fill="#0f172a" />

        {/* Handle bar with black rubber grip */}
        <rect x="50" y="4" width="100" height="6" rx="3" fill="url(#steelPipe)" />
        <rect x="65" y="3" width="70" height="8" rx="2" fill="#0f172a" /> {/* Black grip */}

        {/* Shelf wire deck lines (grid patterned dividers) */}
        {/* Horizontal shelf decks */}
        <rect x="12" y="48" width="176" height="4" fill="url(#steelPipe)" />
        <rect x="12" y="88" width="176" height="4" fill="url(#steelPipe)" />
        <rect x="12" y="126" width="176" height="4" fill="url(#steelPipe)" />

        {/* Vertical shelf grid support wires */}
        <line x1="70" y1="12" x2="70" y2="128" stroke="#94a3b8" strokeWidth="1" opacity="0.7" />
        <line x1="130" y1="12" x2="130" y2="128" stroke="#94a3b8" strokeWidth="1" opacity="0.7" />
      </svg>

      {/* Tote slots — rendered as children over the SVG */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto">
            {children}
          </div>
        </div>
      )}

      {/* Barcode label on the cart frame */}
      <div className="mt-1">
        <BarcodeLabel
          value={cartBarcode}
          scannable={scannable}
          difficulty={difficulty}
          onScan={onScan}
        />
      </div>

      {/* Cart ID label */}
      <span
        className="text-[9px] font-mono text-slate-500 mt-0.5"
        style={{ letterSpacing: "0.05em" }}
      >
        Cart {cartBarcode}
      </span>

      {/* BEGINNER: "← SCAN THIS" badge */}
      {highlighted && scannable && difficulty === DifficultyLevel.BEGINNER && (
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2"
          style={{
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
