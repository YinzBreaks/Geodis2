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
 * Estimated height of the RF Device bezel label + top padding before the
 * screen area starts, in pixels. Accounts for the device label row and
 * outer padding of the bezel container.
 */
const SCREEN_TOP_OFFSET_PX = 58

/**
 * Estimated height in pixels of the terminal screen area.
 * Approximate: 12 lines × ~20px per line (13px font × 1.4 lineHeight = 18.2px + label row).
 */
const SCREEN_HEIGHT_PX = 240

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

  // Calculate approximate Y position of the target line.
  // Each screen.lines entry averages ~20px in visual height.
  const lineRatio =
    screenLineCount > 0 ? highlightLine / screenLineCount : 0
  const arrowTop =
    SCREEN_TOP_OFFSET_PX + lineRatio * SCREEN_HEIGHT_PX + 10

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
