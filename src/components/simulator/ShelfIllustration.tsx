/**
 * ShelfIllustration — mini SVG showing 3 shelf levels (A / B / C).
 *
 * Parses the last character of the ALOC value to determine which shelf
 * to highlight in amber. Used in CoachingPanel for location-step context.
 *
 * Per CLAUDE.md §Architecture: components render only.
 */
"use client"

interface ShelfIllustrationProps {
  /** Warehouse location string, e.g. "316-001-A1". Last char before digits is shelf letter. */
  location?: string
  /** Override width (default 120) */
  width?: number
  /** Override height (default 80) */
  height?: number
}

const SHELF_LEVELS: { letter: string; y: number }[] = [
  { letter: "A", y: 12 },
  { letter: "B", y: 36 },
  { letter: "C", y: 60 },
]

const AMBER = "var(--color-amber, #f0a500)"
const SURFACE = "var(--color-surface-2, #21262d)"
const TEXT_SEC = "var(--color-text-secondary, #8b949e)"

/**
 * Extracts the shelf letter (A, B, or C) from a warehouse location code.
 * Location format: AAA-NNN-XX where the first character of XX is the shelf letter.
 */
function parseShelfLetter(location?: string): string | null {
  if (!location) return null
  // Match pattern like "316-001-A1" — shelf letter is after last hyphen
  const match = location.match(/-([A-Ca-c])\d*$/)
  return match ? match[1].toUpperCase() : null
}

/** 120×80 SVG with 3 shelf levels; active shelf highlighted amber. */
export function ShelfIllustration({ location, width = 120, height = 80 }: ShelfIllustrationProps) {
  const activeShelf = parseShelfLetter(location)

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={activeShelf ? `Shelf ${activeShelf} highlighted` : "Shelf illustration"}
    >
      {/* Shelf upright posts */}
      <rect x="8" y="4" width="3" height="72" rx="1" fill={SURFACE} />
      <rect x="109" y="4" width="3" height="72" rx="1" fill={SURFACE} />

      {/* Shelf levels */}
      {SHELF_LEVELS.map(({ letter, y }) => {
        const isActive = activeShelf === letter
        return (
          <g key={letter}>
            {/* Shelf surface */}
            <rect
              x="10"
              y={y}
              width="100"
              height="4"
              rx="1"
              fill={isActive ? AMBER : SURFACE}
              opacity={isActive ? 1 : 0.6}
            />
            {/* Shelf label */}
            <text
              x="3"
              y={y + 3}
              fontSize="6"
              fontFamily="var(--font-mono, monospace)"
              fill={isActive ? AMBER : TEXT_SEC}
              textAnchor="middle"
            >
              {letter}
            </text>
            {/* Item boxes on shelf */}
            {isActive && (
              <>
                <rect x="20" y={y - 8} width="14" height="8" rx="1" fill={AMBER} opacity={0.5} />
                <rect x="38" y={y - 10} width="12" height="10" rx="1" fill={AMBER} opacity={0.7} />
                <rect x="54" y={y - 7} width="16" height="7" rx="1" fill={AMBER} opacity={0.4} />
              </>
            )}
            {!isActive && (
              <>
                <rect x="22" y={y - 6} width="10" height="6" rx="1" fill={SURFACE} opacity={0.3} />
                <rect x="40" y={y - 8} width="12" height="8" rx="1" fill={SURFACE} opacity={0.3} />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
