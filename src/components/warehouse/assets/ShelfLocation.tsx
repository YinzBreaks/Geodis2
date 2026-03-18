/**
 * ShelfLocation — Warehouse shelf section SVG component
 *
 * Renders a 3-level shelf (A=bottom, B=middle, C=top) with product slots,
 * a location label, and a scannable barcode. The target shelf level is
 * parsed from the ALOC string (last letter before final digit).
 *
 * Per CLAUDE.md §Canonical Domain Vocabulary: Pick Front = shelf location.
 * Per BBWD-WI-030 §5.2: picker travels to Pick Front, verifies location.
 */
"use client"

import { BarcodeLabel } from "./BarcodeLabel"
import { DifficultyLevel } from "@/types/domain"

interface ShelfLocationProps {
  /** Location ALOC, e.g. "316-001-A1" */
  aloc: string
  /** Item barcode at this location (for display) */
  itemBarcode: string
  /** Item name (truncated) */
  itemName: string
  /** Quantity at location */
  quantity: number
  /** Whether the location barcode can be scanned */
  scannable: boolean
  /** Whether to highlight this location */
  highlighted: boolean
  /** Training difficulty */
  difficulty: DifficultyLevel
  /** Called with the ALOC when scanned */
  onScan: (barcode: string) => void
  /** Optional children (ItemLabel) rendered on the correct shelf level */
  children?: React.ReactNode
}

/**
 * Parse the shelf level from an ALOC string.
 * Format: AAA-NNN-XN where X is the level letter.
 *   A → bottom, B → middle, C → top
 */
export function parseShelfLevel(aloc: string): "A" | "B" | "C" {
  // e.g. "316-001-A1" → last segment "A1" → first char "A"
  const parts = aloc.split("-")
  const lastPart = parts[parts.length - 1] ?? "A1"
  const levelChar = lastPart.charAt(0).toUpperCase()
  if (levelChar === "B") return "B"
  if (levelChar === "C") return "C"
  return "A"
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

/** Which SVG y-offset for each shelf level. */
const LEVEL_Y: Record<string, number> = {
  C: 10,  // top shelf
  B: 50,  // middle shelf
  A: 90,  // bottom shelf
}

export function ShelfLocation({
  aloc,
  itemBarcode,
  itemName,
  quantity,
  scannable,
  highlighted,
  difficulty,
  onScan,
  children,
}: ShelfLocationProps) {
  const level = parseShelfLevel(aloc)
  const targetY = LEVEL_Y[level] ?? 90
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
      {/* Shelf SVG */}
      <svg
        viewBox="0 0 220 140"
        style={{ width: 220, height: 140 }}
        aria-label={`Shelf location ${aloc}`}
      >
        {/* Left upright */}
        <rect x="10" y="0" width="6" height="140" fill="#6b7280" />
        {/* Right upright */}
        <rect x="204" y="0" width="6" height="140" fill="#6b7280" />

        {/* Top shelf (C) */}
        <rect x="10" y="8" width="200" height="4" fill="#9ca3af" />
        {/* Middle shelf (B) */}
        <rect x="10" y="48" width="200" height="4" fill="#9ca3af" />
        {/* Bottom shelf (A) */}
        <rect x="10" y="88" width="200" height="4" fill="#9ca3af" />
        {/* Floor */}
        <rect x="10" y="128" width="200" height="4" fill="#9ca3af" />

        {/* Product slots — faded rectangles on each level */}
        {/* Top level slots */}
        <rect x="25" y="14" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="75" y="14" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="130" y="14" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        {/* Middle level slots */}
        <rect x="25" y="54" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="75" y="54" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="130" y="54" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        {/* Bottom level slots */}
        <rect x="25" y="94" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="75" y="94" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />
        <rect x="130" y="94" width="40" height="30" rx="2" fill="#e2e8f0" opacity="0.5" />

        {/* Highlighted target item on the correct shelf level */}
        <rect
          x="75"
          y={targetY + 4}
          width="40"
          height="30"
          rx="2"
          fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "#fbbf24" : "#94a3b8"}
          opacity={highlighted && difficulty !== DifficultyLevel.ADVANCED ? 0.7 : 0.4}
          stroke={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "#f59e0b" : "none"}
          strokeWidth="1.5"
        />
        {/* Qty badge on the target item */}
        {quantity > 0 && (
          <text
            x="95"
            y={targetY + 24}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#374151"
            fontWeight="bold"
          >
            ×{quantity}
          </text>
        )}

        {/* Location label on the left upright */}
        <rect x="0" y="60" width="14" height="28" rx="2" fill="#1e293b" />
        <text
          x="7"
          y="78"
          textAnchor="middle"
          fontSize="6"
          fontFamily="monospace"
          fill="#f8fafc"
          transform="rotate(-90, 7, 78)"
        >
          {aloc}
        </text>
      </svg>

      {/* Location label below shelf */}
      <div
        className="text-xs font-mono font-bold text-center mt-1"
        style={{ color: "#1e293b" }}
      >
        {aloc}
      </div>

      {/* Item info — truncated name */}
      <div
        className="text-[9px] font-mono text-slate-500 text-center truncate"
        style={{ maxWidth: 200 }}
      >
        {itemName.length > 20 ? itemName.slice(0, 20) + "…" : itemName} — Level {level}
      </div>

      {/* Scannable barcode for location verify step */}
      {scannable && (
        <div className="mt-1">
          <BarcodeLabel
            value={aloc}
            scannable={scannable}
            difficulty={difficulty}
            onScan={onScan}
          />
        </div>
      )}

      {/* Children (ItemLabel) positioned below */}
      {children}

      {/* BEGINNER: "← SCAN THIS" badge */}
      {highlighted && scannable && difficulty === DifficultyLevel.BEGINNER && (
        <div
          className="absolute -right-2 top-1/3"
          style={{
            backgroundColor: "rgba(240, 165, 0, 0.9)",
            color: "#000",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "monospace",
            padding: "2px 6px",
            borderRadius: 3,
            whiteSpace: "nowrap",
            zIndex: 2,
          }}
        >
          ← SCAN THIS
        </div>
      )}
    </div>
  )
}
