/**
 * CoachingTooltip — Arrow overlay pointing at the active RF screen line
 *
 * Rendered absolutely inside a relative-positioned wrapper around the
 * RF Device emulator. An animated arrow on the left side of the screen
 * points to the highlighted screen line.
 *
 * The Y position is estimated from highlightLine / screenLineCount —
 * no DOM measurement required.
 *
 * Per requirement spec §STEP 5 — CoachingTooltip component.
 */
"use client"

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Offset in pixels from the top of the position:relative wrapper to the
 * first terminal line. The wrapper starts at the screen area (padding only),
 * so this is just the container padding (8px).
 */
const SCREEN_TOP_OFFSET_PX = 8

/**
 * Estimated height in pixels of the terminal screen area.
 * Approximate: 12 lines × ~20px per line (13px font × 1.4 lineHeight = 18.2px + label row).
 */
const SCREEN_HEIGHT_PX = 240

/**
 * Maximum per-line height in pixels.
 * Prevents the arrow from over-shooting on short screens with 1–2 lines
 * where SCREEN_HEIGHT_PX / lineCount would otherwise be huge.
 */
const MAX_LINE_HEIGHT_PX = 24

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface CoachingTooltipProps {
  /**
   * 0-based index into screen.lines[] to point the arrow at.
   * undefined = do not render the tooltip.
   */
  highlightLine: number | undefined
  /** Total number of lines in the current screen (screen.lines.length) */
  screenLineCount: number
  /** When false, the component renders nothing */
  isVisible: boolean
}

/**
 * Absolutely-positioned arrow that points at a specific line on the
 * RF Device terminal screen. Mount this inside a `position: relative`
 * container that wraps the RF Device emulator.
 *
 * The green pulsing arrow draws the trainee's eye to the active field
 * without obscuring the terminal text.
 */
export function CoachingTooltip({
  highlightLine,
  screenLineCount,
  isVisible,
}: CoachingTooltipProps) {
  if (!isVisible || highlightLine === undefined) return null

  // Calculate Y position centering the arrow on the middle of the target line.
  // Cap lineHeight so short screens (1–2 lines) don't push the arrow below the
  // actual rendered content area. With MAX_LINE_HEIGHT_PX = 24, estimatedHeight
  // = screenLineCount × 24 which closely matches the actual rendered height.
  const lineHeight = screenLineCount > 0
    ? Math.min(SCREEN_HEIGHT_PX / screenLineCount, MAX_LINE_HEIGHT_PX)
    : MAX_LINE_HEIGHT_PX
  const estimatedContentHeight = screenLineCount * lineHeight
  const rawArrowY = (highlightLine + 0.5) * lineHeight
  // Hard cap: arrow never exits the visible screen boundary.
  // Cap is (estimatedContentHeight - 8) so it always points inside the content.
  const clampedArrowY = Math.max(8, Math.min(estimatedContentHeight - 8, rawArrowY))
  const arrowTop = SCREEN_TOP_OFFSET_PX + clampedArrowY

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: -24,
        top: arrowTop,
        display: "flex",
        alignItems: "center",
        gap: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {/* Horizontal line */}
      <div
        style={{
          width: 16,
          height: 2,
          backgroundColor: "#00ff41",
          animation: "coaching-arrow-pulse 2s ease-in-out infinite",
        }}
      />
      {/* Arrow head (right-pointing triangle) */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          borderLeft: "7px solid #00ff41",
          filter: "drop-shadow(0 0 3px #00ff41)",
          animation: "coaching-arrow-pulse 2s ease-in-out infinite",
        }}
      />
    </div>
  )
}
