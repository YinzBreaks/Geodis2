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
      {/* Cart frame SVG */}
      <svg
        viewBox="0 0 200 160"
        style={{ width: 200, height: 160 }}
        aria-label="Pick Cart"
      >
        {/* Cart body — steel gray frame */}
        <rect x="10" y="10" width="180" height="120" rx="4"
          fill="none" stroke="#6b7280" strokeWidth="3" />
        {/* Handle bar */}
        <rect x="60" y="4" width="80" height="6" rx="3"
          fill="#9ca3af" />
        {/* Shelf dividers (3 rows × 3 cols = 9 slots) */}
        <line x1="10" y1="50" x2="190" y2="50" stroke="#9ca3af" strokeWidth="1.5" />
        <line x1="10" y1="90" x2="190" y2="90" stroke="#9ca3af" strokeWidth="1.5" />
        <line x1="70" y1="10" x2="70" y2="130" stroke="#9ca3af" strokeWidth="1.5" />
        <line x1="130" y1="10" x2="130" y2="130" stroke="#9ca3af" strokeWidth="1.5" />
        {/* Wheels */}
        <circle cx="30" cy="145" r="10" fill="#6b7280" opacity="0.7" />
        <circle cx="170" cy="145" r="10" fill="#6b7280" opacity="0.7" />
        <circle cx="30" cy="145" r="4" fill="#4b5563" />
        <circle cx="170" cy="145" r="4" fill="#4b5563" />
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
