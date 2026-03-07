/**
 * RFDeviceDisplay — RF Device terminal screen renderer
 *
 * Renders RFScreenLine[] as a fixed-width 20-character terminal grid,
 * replicating the Manhattan WMS telnet-style screen on the real device.
 *
 * Key behaviours:
 *   - Fixed-width monospace text — each line = one terminal row
 *   - white-space: pre so spaces are preserved and lines never wrap
 *   - Lines wider than 20 chars are clipped (no scroll)
 *   - Active cursor field shows a blinking underscore after the typed value
 *   - No rounded corners (terminal bezel look)
 *   - All colors / fonts come from the device's RFDeviceScreenConfig
 *
 * Per CLAUDE.md §Architecture: components render only.
 * Per SIMULATION.md §RF Device Screen Generator
 * Per BBWD-VJA-030 SOP screenshots
 */
"use client"

import type { RFDeviceScreen, RFScreenLine } from "@/types/domain"
import type { RFDeviceScreenConfig } from "@/types/devices"

/** Fallback terminal-green defaults when no screenConfig is supplied. */
const TERMINAL_DEFAULTS: RFDeviceScreenConfig = {
  bgColor: "#0a0a0a",
  textColor: "#e8e8e8",
  fontFamily: "'Courier New', 'Lucida Console', monospace",
  highlightColor: "#00ff41",
  cursorColor: "#00ff41",
  labelColor: "#e8e8e8",
  fontSize: "13px",
  lineHeight: "1.4",
}

/** Characters wide for the terminal grid — matches all device displayColumns. */
const TERMINAL_COLS = 20

interface Props {
  screen: RFDeviceScreen
  /** Current user input value — shown in the active cursor field. */
  inputValue: string
  /**
   * Screen color + font config from the active device model.
   * Falls back to terminal-green defaults when omitted.
   */
  screenConfig?: RFDeviceScreenConfig
  /**
   * 0-based index into screen.lines[] to highlight with a coaching tint.
   * When set, that line gets a subtle green background to direct the trainee's
   * attention. Only used in BEGINNER mode.
   */
  highlightLine?: number
}

export function RFDeviceDisplay({ screen, inputValue, screenConfig, highlightLine }: Props) {
  const cfg = screenConfig ?? TERMINAL_DEFAULTS

  return (
    <div
      style={{
        backgroundColor: cfg.bgColor,
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize ?? "13px",
        lineHeight: cfg.lineHeight ?? "1.4",
        padding: "8px 10px",
        // Force the screen area to exactly TERMINAL_COLS characters wide.
        // This clips lines longer than 20 chars, exactly like the real device.
        width: `${TERMINAL_COLS}ch`,
        maxWidth: "100%",
        overflowX: "hidden",
        userSelect: "none",
      }}
    >
      {screen.lines.map((line, i) => (
        <TerminalLine
          key={i}
          line={line}
          inputValue={line.isCursorField ? inputValue : ""}
          cfg={cfg}
          isCoachingHighlight={i === highlightLine}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL LINE
// Each line occupies one fixed-width text row on the character grid.
// ─────────────────────────────────────────────────────────────────────────────

function TerminalLine({
  line,
  inputValue,
  cfg,
  isCoachingHighlight,
}: {
  line: RFScreenLine
  inputValue: string
  cfg: RFDeviceScreenConfig
  /** When true, a subtle green tint is applied to draw the trainee's attention */
  isCoachingHighlight: boolean
}) {
  const textColor = line.isHighlighted ? cfg.highlightColor : cfg.textColor
  // Coaching tint applied as a wrapper background — does not obscure text
  const coachingBg = isCoachingHighlight ? "rgba(0, 255, 65, 0.12)" : undefined

  // ── Cursor (active input) line ─────────────────────────────────────────
  if (line.isCursorField) {
    // Per SOP screenshots: label on its own line, cursor value on the next.
    //   SCAN TOTE:
    //   T00000000011692_
    return (
      <div style={{ backgroundColor: coachingBg }}>
        {line.label && (
          <div
            style={{
              color: cfg.labelColor,
              whiteSpace: "pre",
              overflow: "hidden",
            }}
          >
            {line.label}
          </div>
        )}
        <div
          style={{
            color: cfg.cursorColor,
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          {inputValue}
          {/* Blinking cursor — CSS class injected via globals.css @keyframes terminal-blink */}
          <span className="terminal-cursor">_</span>
        </div>
      </div>
    )
  }

  // ── Label + value lines ────────────────────────────────────────────────
  // Per SOP screenshots: label on one line, value on the next.
  //   PICK CART #:
  //   C000000083
  if (line.label && line.value) {
    return (
      <div style={{ backgroundColor: coachingBg }}>
        <div style={{ whiteSpace: "pre", overflow: "hidden", color: cfg.labelColor }}>
          {line.label}
        </div>
        <div style={{ whiteSpace: "pre", overflow: "hidden", color: textColor }}>
          {line.value}
        </div>
      </div>
    )
  }

  // ── Label-only line ────────────────────────────────────────────────────
  if (line.label) {
    return (
      <div style={{ whiteSpace: "pre", overflow: "hidden", color: cfg.labelColor, backgroundColor: coachingBg }}>
        {line.label}
      </div>
    )
  }

  // ── Value-only line ─────────────────────────────────────────────────
  if (line.value) {
    return (
      <div style={{ whiteSpace: "pre", overflow: "hidden", color: textColor, backgroundColor: coachingBg }}>
        {line.value}
      </div>
    )
  }

  // ── Empty line — preserves vertical spacing ────────────────────────────
  return (
    <div style={{ whiteSpace: "pre", color: textColor }}>
      {" "}
    </div>
  )
}
