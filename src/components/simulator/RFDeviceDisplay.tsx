/**
 * RFDeviceDisplay — RF Device screen renderer
 *
 * Supports two rendering modes:
 *   "terminal" / "android" — Fixed-width 20-char terminal grid
 *   "modern" — Structured label/value rows with amber accents
 *
 * Key behaviours:
 *   - Terminal mode: Fixed-width monospace text, each line = one terminal row
 *   - Modern mode: Each field is a structured row with small label + large value
 *   - All colors / fonts come from the device's RFDeviceScreenConfig
 *
 * Per CLAUDE.md §Architecture: components render only.
 * Per SIMULATION.md §RF Device Screen Generator
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
   * When set, that line gets a subtle background to direct the trainee's
   * attention. Only used in BEGINNER mode.
   */
  highlightLine?: number
  /**
   * Rendering mode for the screen.
   * "modern" renders structured label/value rows with amber accents.
   * "terminal" / "android" render the classic terminal grid.
   */
  renderMode?: "terminal" | "android" | "modern"
  /** Title shown in the modern title bar — step name */
  stepName?: string
  /** Maximum visible rows for the terminal renderer. Defaults to screen.lines.length (unclamped). */
  displayRows?: number
  /** Width of the emulator in pixels. Defaults to TERMINAL_COLS * ch when omitted. */
  emulatorWidthPx?: number
  /** Override the default "8px 10px" padding. Pass "0" or "4px 6px" for tight overlays. */
  padding?: string
}

export function RFDeviceDisplay({
  screen,
  inputValue,
  screenConfig,
  highlightLine,
  renderMode = "terminal",
  stepName,
  displayRows,
  emulatorWidthPx,
  padding,
}: Props) {
  const cfg = screenConfig ?? TERMINAL_DEFAULTS

  // Modern rendering path
  if (renderMode === "modern") {
    return (
      <ModernScreen
        screen={screen}
        inputValue={inputValue}
        cfg={cfg}
        highlightLine={highlightLine}
        stepName={stepName}
      />
    )
  }

  // Clamp lines to displayRows when the device config limits visible rows.
  const visibleLines = displayRows
    ? screen.lines.slice(0, displayRows)
    : screen.lines

  // Terminal rendering path (original)
  return (
    <div
      style={{
        backgroundColor: cfg.bgColor,
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize ?? "13px",
        lineHeight: cfg.lineHeight ?? "1.4",
        padding: padding ?? "8px 10px",
        width: emulatorWidthPx ? `${emulatorWidthPx}px` : `${TERMINAL_COLS}ch`,
        maxWidth: "100%",
        overflowX: "hidden",
        userSelect: "none",
      }}
    >
      {visibleLines.map((line, i) => (
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
// MODERN SCREEN — structured label/value rows
// ─────────────────────────────────────────────────────────────────────────────

function ModernScreen({
  screen,
  inputValue,
  cfg,
  highlightLine,
  stepName,
}: {
  screen: RFDeviceScreen
  inputValue: string
  cfg: RFDeviceScreenConfig
  highlightLine?: number
  stepName?: string
}) {
  return (
    <div
      style={{
        backgroundColor: cfg.bgColor,
        fontFamily: cfg.fontFamily,
        fontSize: cfg.fontSize ?? "14px",
        lineHeight: cfg.lineHeight ?? "1.6",
        minHeight: "260px",
        userSelect: "none",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          backgroundColor: "var(--color-surface-2)",
          padding: "6px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "10px",
            fontWeight: 600,
            color: "var(--color-text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          WarehousePro
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--color-text-muted)",
          }}
        >
          {stepName ?? screen.screenId ?? ""}
        </span>
      </div>

      {/* Screen content — structured rows */}
      <div style={{ padding: "10px 12px" }}>
        {screen.lines.map((line, i) => (
          <ModernRow
            key={i}
            line={line}
            inputValue={line.isCursorField ? inputValue : ""}
            cfg={cfg}
            isCoachingHighlight={i === highlightLine}
          />
        ))}
      </div>
    </div>
  )
}

/** Modern rendering of a single screen field/line. */
function ModernRow({
  line,
  inputValue,
  cfg,
  isCoachingHighlight,
}: {
  line: RFScreenLine
  inputValue: string
  cfg: RFDeviceScreenConfig
  isCoachingHighlight: boolean
}) {
  const highlightBg = isCoachingHighlight ? "var(--color-amber-glow)" : undefined

  // Cursor (active input) field — amber styling
  if (line.isCursorField) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-amber-glow)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 8px",
          marginBottom: "6px",
        }}
      >
        {line.label && (
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "10px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--color-amber)",
              marginBottom: "2px",
            }}
          >
            {line.label}
          </div>
        )}
        <div
          style={{
            fontFamily: cfg.fontFamily,
            fontSize: "16px",
            color: cfg.textColor,
            borderBottom: "2px solid var(--color-amber)",
            paddingBottom: "2px",
            minHeight: "24px",
          }}
        >
          {inputValue}
          <span className="terminal-cursor" style={{ color: "var(--color-amber)" }}>
            _
          </span>
        </div>
      </div>
    )
  }

  // Label + value pairs
  if (line.label && line.value) {
    return (
      <div
        style={{
          padding: "4px 0",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "4px",
          backgroundColor: highlightBg,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--color-text-secondary)",
            marginBottom: "1px",
          }}
        >
          {line.label}
        </div>
        <div
          style={{
            fontFamily: cfg.fontFamily,
            fontSize: "16px",
            color: line.isHighlighted ? cfg.highlightColor : cfg.textColor,
          }}
        >
          {line.value}
        </div>
      </div>
    )
  }

  // Label-only — section header
  if (line.label) {
    return (
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--color-text-secondary)",
          padding: "4px 0",
          backgroundColor: highlightBg,
        }}
      >
        {line.label}
      </div>
    )
  }

  // Value-only
  if (line.value) {
    return (
      <div
        style={{
          fontFamily: cfg.fontFamily,
          fontSize: "14px",
          color: line.isHighlighted ? cfg.highlightColor : cfg.textColor,
          padding: "2px 0",
          backgroundColor: highlightBg,
        }}
      >
        {line.value}
      </div>
    )
  }

  // Empty line — spacing
  return <div style={{ height: "8px" }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL LINE (original rendering)
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
  const coachingBg = isCoachingHighlight ? "rgba(0, 255, 65, 0.12)" : undefined

  // ── Cursor (active input) line ─────────────────────────────────────────
  if (line.isCursorField) {
    return (
      <div style={{ backgroundColor: coachingBg }}>
        {line.label && (
          <div
            style={{
              color: cfg.labelColor,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
          >
            {line.label}
          </div>
        )}
        <div
          style={{
            color: cfg.cursorColor,
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          }}
        >
          {inputValue}
          <span className="terminal-cursor" style={{ color: cfg.cursorColor }}>_</span>
        </div>
      </div>
    )
  }

  // ── Label + value lines ────────────────────────────────────────────────
  if (line.label && line.value) {
    return (
      <div style={{ backgroundColor: coachingBg }}>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", color: cfg.labelColor }}>
          {line.label}
        </div>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", color: textColor }}>
          {line.value}
        </div>
      </div>
    )
  }

  // ── Label-only line ────────────────────────────────────────────────────
  if (line.label) {
    return (
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", color: cfg.labelColor, backgroundColor: coachingBg }}>
        {line.label}
      </div>
    )
  }

  // ── Value-only line ─────────────────────────────────────────────────
  if (line.value) {
    return (
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", color: textColor, backgroundColor: coachingBg }}>
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
