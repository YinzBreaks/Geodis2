/**
 * ItemLabel — Scannable item/product label component
 *
 * Renders a product box shape with item name, UPC barcode, and a scannable
 * BarcodeLabel. Used on the shelf during PK_SCAN_ITEM_UPC steps.
 *
 * Per CLAUDE.md §Canonical Domain Vocabulary: Item = product in inventory.
 * Per BBWD-WI-030 §5.2.9: scan item UPC barcode.
 */
"use client"

import { BarcodeLabel } from "./BarcodeLabel"
import { DifficultyLevel } from "@/types/domain"

interface ItemLabelProps {
  /** Item UPC barcode, e.g. "024505572001" */
  itemBarcode: string
  /** Product name (truncated to 20 chars in display) */
  itemName: string
  /** Whether this item's barcode can be scanned */
  scannable: boolean
  /** Whether to highlight this item (difficulty-aware) */
  highlighted: boolean
  /** Training difficulty — drives highlight intensity */
  difficulty: DifficultyLevel
  /** Called with barcode value after scan delay */
  onScan: (barcode: string) => void
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

export function ItemLabel({
  itemBarcode,
  itemName,
  scannable,
  highlighted,
  difficulty,
  onScan,
}: ItemLabelProps) {
  const highlightStyle = getHighlightStyle(highlighted, difficulty)
  const displayName = itemName.length > 20 ? itemName.slice(0, 20) + "…" : itemName

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        ...highlightStyle,
        borderRadius: 6,
        padding: 6,
        backgroundColor: highlighted && difficulty !== DifficultyLevel.ADVANCED
          ? "rgba(240, 165, 0, 0.05)"
          : "#f8fafc",
        border: highlighted && difficulty !== DifficultyLevel.ADVANCED
          ? "1px solid rgba(240, 165, 0, 0.3)"
          : "1px solid #e2e8f0",
        transition: "box-shadow 0.3s, background-color 0.2s",
      }}
    >
      <svg
        viewBox="0 0 64 44"
        style={{ width: 64, height: 44, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" }}
        aria-label={displayName}
      >
        <defs>
          {/* Detailed Box Body Gradient */}
          <linearGradient id="itemBoxBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="40%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#92400e" />
          </linearGradient>
          {/* Detailed Box Top Flap Gradient */}
          <linearGradient id="itemBoxFlap" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="50%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
        </defs>

        {/* Box body */}
        <rect x="2" y="4" width="60" height="36" rx="2"
          fill="url(#itemBoxBody)" stroke="#92400e" strokeWidth="0.75" />
        
        {/* Box fold crease line */}
        <line x1="32" y1="4" x2="32" y2="40" stroke="#78350f" strokeWidth="0.5" opacity="0.4" />

        {/* Box flap */}
        <path d="M2,4 L12,0 L52,0 L62,4 Z" fill="url(#itemBoxFlap)" stroke="#a16207" strokeWidth="0.75" />

        {/* Product shipping label sticker */}
        <rect x="8" y="12" width="30" height="12" rx="1"
          fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.5" />
        {/* Dummy shipping label lines */}
        <line x1="12" y1="15" x2="26" y2="15" stroke="#475569" strokeWidth="1" />
        <line x1="12" y1="18" x2="32" y2="18" stroke="#475569" strokeWidth="0.75" />
        <line x1="12" y1="21" x2="22" y2="21" stroke="#94a3b8" strokeWidth="0.75" />

        {/* Clear/brown packaging tape running down center fold */}
        <rect x="30" y="4" width="4" height="36" fill="#ca8a04" opacity="0.35" />
      </svg>

      {/* Item name */}
      <span
        className="text-[10px] font-mono text-slate-700 text-center mt-1 leading-tight"
        style={{ maxWidth: 140 }}
      >
        {displayName}
      </span>

      {/* Barcode label */}
      <div className="mt-1">
        <BarcodeLabel
          value={itemBarcode}
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
