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
      <svg
        viewBox="0 0 220 140"
        style={{ width: 220, height: 140, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.15))" }}
        aria-label={`Shelf location ${aloc}`}
      >
        <defs>
          {/* Orange steel upright frame gradient */}
          <linearGradient id="orangeUpright" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="35%" stopColor="#f97316" />
            <stop offset="70%" stopColor="#c2410c" />
            <stop offset="100%" stopColor="#7c2d12" />
          </linearGradient>

          {/* Shelf horizontal steel beam gradient */}
          <linearGradient id="shelfSteel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Regular cardboard box gradient */}
          <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.8" />
          </linearGradient>
          
          {/* Shadowed side of regular cardboard box */}
          <linearGradient id="boxShadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#854d0e" stopOpacity="0.9" />
          </linearGradient>

          {/* Highlighted cardboard box gradient */}
          <linearGradient id="boxHighGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="boxHighShadowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>

          {/* Concrete warehouse floor gradient */}
          <linearGradient id="concreteFloor" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Concrete Floor Background */}
        <rect x="0" y="128" width="220" height="12" fill="url(#concreteFloor)" />

        {/* Left upright pillar (Orange Rack) */}
        <rect x="10" y="0" width="6" height="130" fill="url(#orangeUpright)" />
        {/* Upright holes (racks have holes for adjustment) */}
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={`lh-${i}`} x="12" y={6 + i * 10} width="2" height="4" rx="0.5" fill="#1e293b" opacity="0.4" />
        ))}

        {/* Right upright pillar (Orange Rack) */}
        <rect x="204" y="0" width="6" height="130" fill="url(#orangeUpright)" />
        {/* Upright holes right */}
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={`rh-${i}`} x="206" y={6 + i * 10} width="2" height="4" rx="0.5" fill="#1e293b" opacity="0.4" />
        ))}

        {/* Top shelf horizontal beam (C) */}
        <rect x="10" y="8" width="200" height="6" fill="url(#shelfSteel)" />
        {/* Middle shelf horizontal beam (B) */}
        <rect x="10" y="48" width="200" height="6" fill="url(#shelfSteel)" />
        {/* Bottom shelf horizontal beam (A) */}
        <rect x="10" y="88" width="200" height="6" fill="url(#shelfSteel)" />
        {/* Floor horizontal structural support */}
        <rect x="10" y="128" width="200" height="4" fill="#334155" />

        {/* ── Level C (Top) Boxes ── */}
        {/* Box Left */}
        <g opacity="0.75">
          <rect x="25" y="14" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="45" y="14" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="28" y="20" width="8" height="6" fill="#fff" opacity="0.9" /> {/* Shipping Label */}
          <line x1="33" y1="14" x2="33" y2="44" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" /> {/* Tape */}
        </g>
        {/* Box Middle (Check if correct item) */}
        {level === "C" ? (
          <g style={{ filter: highlighted && difficulty !== DifficultyLevel.ADVANCED ? "drop-shadow(0 0 4px #fbbf24)" : "none" }}>
            <rect x="75" y="14" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighGrad)" : "url(#boxGrad)"} />
            <rect x="95" y="14" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighShadowGrad)" : "url(#boxShadowGrad)"} />
            <rect x="78" y="20" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="14" x2="83" y2="44" stroke={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "#d97706" : "#854d0e"} strokeWidth="1.5" opacity="0.6" />
          </g>
        ) : (
          <g opacity="0.75">
            <rect x="75" y="14" width="20" height="30" fill="url(#boxGrad)" />
            <rect x="95" y="14" width="20" height="30" fill="url(#boxShadowGrad)" />
            <rect x="78" y="20" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="14" x2="83" y2="44" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
          </g>
        )}
        {/* Box Right */}
        <g opacity="0.75">
          <rect x="135" y="14" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="155" y="14" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="138" y="20" width="8" height="6" fill="#fff" opacity="0.9" />
          <line x1="143" y1="14" x2="143" y2="44" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
        </g>

        {/* ── Level B (Middle) Boxes ── */}
        {/* Box Left */}
        <g opacity="0.75">
          <rect x="25" y="54" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="45" y="54" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="28" y="60" width="8" height="6" fill="#fff" opacity="0.9" />
          <line x1="33" y1="54" x2="33" y2="84" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
        </g>
        {/* Box Middle */}
        {level === "B" ? (
          <g style={{ filter: highlighted && difficulty !== DifficultyLevel.ADVANCED ? "drop-shadow(0 0 4px #fbbf24)" : "none" }}>
            <rect x="75" y="54" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighGrad)" : "url(#boxGrad)"} />
            <rect x="95" y="54" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighShadowGrad)" : "url(#boxShadowGrad)"} />
            <rect x="78" y="60" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="54" x2="83" y2="84" stroke={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "#d97706" : "#854d0e"} strokeWidth="1.5" opacity="0.6" />
          </g>
        ) : (
          <g opacity="0.75">
            <rect x="75" y="54" width="20" height="30" fill="url(#boxGrad)" />
            <rect x="95" y="54" width="20" height="30" fill="url(#boxShadowGrad)" />
            <rect x="78" y="60" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="54" x2="83" y2="84" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
          </g>
        )}
        {/* Box Right */}
        <g opacity="0.75">
          <rect x="135" y="54" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="155" y="54" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="138" y="60" width="8" height="6" fill="#fff" opacity="0.9" />
          <line x1="143" y1="54" x2="143" y2="84" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
        </g>

        {/* ── Level A (Bottom) Boxes ── */}
        {/* Box Left */}
        <g opacity="0.75">
          <rect x="25" y="94" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="45" y="94" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="28" y="100" width="8" height="6" fill="#fff" opacity="0.9" />
          <line x1="33" y1="94" x2="33" y2="124" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
        </g>
        {/* Box Middle */}
        {level === "A" ? (
          <g style={{ filter: highlighted && difficulty !== DifficultyLevel.ADVANCED ? "drop-shadow(0 0 4px #fbbf24)" : "none" }}>
            <rect x="75" y="94" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighGrad)" : "url(#boxGrad)"} />
            <rect x="95" y="94" width="20" height="30" fill={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "url(#boxHighShadowGrad)" : "url(#boxShadowGrad)"} />
            <rect x="78" y="100" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="94" x2="83" y2="124" stroke={highlighted && difficulty !== DifficultyLevel.ADVANCED ? "#d97706" : "#854d0e"} strokeWidth="1.5" opacity="0.6" />
          </g>
        ) : (
          <g opacity="0.75">
            <rect x="75" y="94" width="20" height="30" fill="url(#boxGrad)" />
            <rect x="95" y="94" width="20" height="30" fill="url(#boxShadowGrad)" />
            <rect x="78" y="100" width="8" height="6" fill="#fff" opacity="0.9" />
            <line x1="83" y1="94" x2="83" y2="124" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
          </g>
        )}
        {/* Box Right */}
        <g opacity="0.75">
          <rect x="135" y="94" width="20" height="30" fill="url(#boxGrad)" />
          <rect x="155" y="94" width="20" height="30" fill="url(#boxShadowGrad)" />
          <rect x="138" y="100" width="8" height="6" fill="#fff" opacity="0.9" />
          <line x1="143" y1="94" x2="143" y2="124" stroke="#854d0e" strokeWidth="1.5" opacity="0.6" />
        </g>

        {/* Target quantity text overlaid inside target box front */}
        {quantity > 0 && (
          <g>
            {/* Soft dark badge background */}
            <rect x="88" y={targetY + 20} width="14" height="10" rx="2" fill="#1e293b" opacity="0.8" />
            <text
              x="95"
              y={targetY + 28}
              textAnchor="middle"
              fontSize="8"
              fontFamily="monospace"
              fill="#fbbf24"
              fontWeight="bold"
            >
              x{quantity}
            </text>
          </g>
        )}

        {/* Location label on the left upright (Magnetic shelf rack label) */}
        <rect x="0" y="60" width="14" height="28" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
        <text
          x="7"
          y="74"
          textAnchor="middle"
          fontSize="5"
          fontFamily="monospace"
          fill="#fcd34d"
          fontWeight="bold"
          transform="rotate(-90, 7, 74)"
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
