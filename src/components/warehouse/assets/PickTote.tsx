/**
 * PickTote — Plastic pick tote SVG component
 *
 * Renders a dark blue rectangular tote box with a barcode label,
 * slot number badge, and optional item count. Used during Build Cart
 * tote scanning and Pick Phase tote scanning.
 *
 * Per CLAUDE.md §Canonical Domain Vocabulary: Tote = barcoded container on cart.
 * Per BBWD-WI-030 §5.1: 9 totes per cart.
 */
"use client"

import { BarcodeLabel } from "./BarcodeLabel"
import { DifficultyLevel } from "@/types/domain"

interface PickToteProps {
  /** Tote barcode value, e.g. "T00000000011692" */
  toteBarcode: string
  /** Slot number (1–9) */
  slotNumber: number
  /** Number of items currently in the tote */
  itemCount: number
  /** Whether the barcode label can be clicked to scan */
  scannable: boolean
  /** Whether to show the highlight glow (difficulty-aware) */
  highlighted: boolean
  /** Training difficulty — drives highlight intensity */
  difficulty: DifficultyLevel
  /** Called with barcode value after scan delay */
  onScan: (barcode: string) => void
  /** Whether this tote slot has been scanned during Build Cart (barcode set) */
  isLoaded?: boolean
}

function getHighlightStyle(highlighted: boolean, difficulty: DifficultyLevel): React.CSSProperties {
  if (!highlighted || difficulty === DifficultyLevel.ADVANCED) return {}
  if (difficulty === DifficultyLevel.BEGINNER) {
    return {
      boxShadow: "0 0 16px rgba(240, 165, 0, 0.6)",
      animation: "assetPulse 1.5s ease-in-out infinite",
    }
  }
  return {
    boxShadow: "0 0 6px rgba(240, 165, 0, 0.25)",
  }
}

export function PickTote({
  toteBarcode,
  slotNumber,
  itemCount,
  scannable,
  highlighted,
  difficulty,
  onScan,
  isLoaded = false,
}: PickToteProps) {
  const highlightStyle = getHighlightStyle(highlighted, difficulty)

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        ...highlightStyle,
        borderRadius: 6,
        padding: 4,
        transition: "box-shadow 0.3s",
      }}
    >
      {/* Tote SVG */}
      <svg
        viewBox="0 0 80 56"
        style={{ width: 80, height: 56 }}
        aria-label={`Tote Slot ${slotNumber}`}
      >
        {/* Tote body — green border + tint when loaded, dark blue otherwise */}
        <rect x="2" y="6" width="76" height="48" rx="3"
          fill={isLoaded ? "#142e20" : "#1e3a5f"} stroke={isLoaded ? "#22c55e" : "#15304f"} strokeWidth="1.5" />
        {/* Rounded top edge */}
        <rect x="2" y="6" width="76" height="8" rx="3"
          fill={isLoaded ? "#1a3d28" : "#254d7a"} />
        {/* Items inside — small rectangles if itemCount > 0 */}
        {Array.from({ length: Math.min(itemCount, 4) }, (_, i) => (
          <rect
            key={i}
            x={8 + (i % 2) * 32}
            y={22 + Math.floor(i / 2) * 14}
            width={28}
            height={10}
            rx={1}
            fill="#94a3b8"
            opacity={0.6}
          />
        ))}
        {/* Loaded checkmark — shown when tote scanned in but no items picked yet */}
        {isLoaded && itemCount === 0 && (
          <text x="40" y="38" textAnchor="middle" fontSize="18" fill="#22c55e" opacity={0.85} fontWeight="bold">✓</text>
        )}
      </svg>

      {/* Slot number badge — top-right */}
      <div
        className="absolute top-0 right-0"
        style={{
          backgroundColor: highlighted ? "#f0a500" : "#6b7280",
          color: highlighted ? "#000" : "#fff",
          fontSize: 8,
          fontWeight: 700,
          fontFamily: "monospace",
          padding: "1px 4px",
          borderRadius: "0 4px 0 4px",
          lineHeight: 1.2,
        }}
      >
        S{slotNumber}
      </div>

      {/* Barcode label */}
      <div className="mt-0.5">
        <BarcodeLabel
          value={toteBarcode}
          scannable={scannable}
          difficulty={difficulty}
          onScan={onScan}
        />
      </div>

      {/* BEGINNER: "← SCAN THIS" badge */}
      {highlighted && scannable && difficulty === DifficultyLevel.BEGINNER && (
        <div
          className="absolute -right-2 top-1/2 -translate-y-1/2"
          style={{
            backgroundColor: "rgba(240, 165, 0, 0.9)",
            color: "#000",
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "monospace",
            padding: "2px 5px",
            borderRadius: 3,
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          ← SCAN
        </div>
      )}
    </div>
  )
}
