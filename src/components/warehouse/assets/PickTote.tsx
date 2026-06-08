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
      <svg
        viewBox="0 0 80 56"
        style={{ width: 80, height: 56, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
        aria-label={`Tote Slot ${slotNumber}`}
      >
        <defs>
          {/* Blue Plastic Gloss Gradient */}
          <linearGradient id="toteBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="30%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          {/* Active Green Plastic Gradient */}
          <linearGradient id="toteGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="30%" stopColor="#059669" />
            <stop offset="100%" stopColor="#065f46" />
          </linearGradient>
          {/* Unloaded Empty Tote Gradient */}
          <linearGradient id="toteEmpty" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          
          {/* Package item gradients */}
          <linearGradient id="pkgYellow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="pkgBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Tote Body */}
        <rect
          x="2"
          y="6"
          width="76"
          height="48"
          rx="4"
          fill={isLoaded ? (itemCount > 0 ? "url(#toteGreen)" : "url(#toteBlue)") : "url(#toteEmpty)"}
          stroke={isLoaded ? "#10b981" : "#334155"}
          strokeWidth="1.5"
        />

        {/* Nested top rim */}
        <rect
          x="1"
          y="6"
          width="78"
          height="7"
          rx="2"
          fill={isLoaded ? "#34d399" : "#64748b"}
          opacity="0.8"
        />

        {/* Structural vertical ribs (very realistic for warehouse nesting plastic totes) */}
        <line x1="12" y1="13" x2="12" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
        <line x1="24" y1="13" x2="24" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
        <line x1="36" y1="13" x2="36" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
        <line x1="44" y1="13" x2="44" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
        <line x1="56" y1="13" x2="56" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />
        <line x1="68" y1="13" x2="68" y2="50" stroke="#1e293b" strokeWidth="1.5" opacity="0.3" />

        {/* Left/Right handle cutouts */}
        <rect x="6" y="24" width="3" height="12" rx="1.5" fill="#111827" opacity="0.6" />
        <rect x="71" y="24" width="3" height="12" rx="1.5" fill="#111827" opacity="0.6" />

        {/* Items inside — colorful small 3D boxes if itemCount > 0 */}
        {isLoaded && Array.from({ length: Math.min(itemCount, 4) }, (_, i) => {
          const itemColor = i % 2 === 0 ? "url(#pkgYellow)" : "url(#pkgBlue)"
          const itemStroke = i % 2 === 0 ? "#854d0e" : "#1e40af"
          return (
            <g key={i} opacity="0.9" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.2))" }}>
              <rect
                x={12 + (i % 2) * 30}
                y={20 + Math.floor(i / 2) * 15}
                width={26}
                height={11}
                rx="1.5"
                fill={itemColor}
                stroke={itemStroke}
                strokeWidth="0.5"
              />
              {/* Shipping tape line on the package inside tote */}
              <line
                x1={25 + (i % 2) * 30}
                y1={20 + Math.floor(i / 2) * 15}
                x2={25 + (i % 2) * 30}
                y2={31 + Math.floor(i / 2) * 15}
                stroke="#6b7280"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </g>
          )
        })}

        {/* Checked/Scanned empty tote indicator */}
        {isLoaded && itemCount === 0 && (
          <g>
            <circle cx="40" cy="30" r="11" fill="#10b981" opacity="0.9" />
            <text x="40" y="35" textAnchor="middle" fontSize="14" fill="#ffffff" fontWeight="bold">✓</text>
          </g>
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
