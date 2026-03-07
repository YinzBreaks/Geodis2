/**
 * RFDeviceDisplay — RF Device terminal screen renderer
 *
 * Renders RFScreenLine[] exactly as the engine produces them.
 * This component never contains logic — it only renders.
 *
 * Per CLAUDE.md §Architecture: components render only.
 * Per SIMULATION.md §RF Device Screen Generator
 */
"use client"

import type { RFDeviceScreen, RFScreenLine } from "@/types/domain"
import type { RFDeviceScreenConfig } from "@/types/devices"

/** Terminal-green defaults used when no screenConfig is supplied. */
const TERMINAL_DEFAULTS: RFDeviceScreenConfig = {
  bgColor: "#050a05",
  textColor: "#22c55e",
  fontFamily: "'Courier New', Courier, monospace",
  highlightColor: "#fde047",
  cursorColor: "#4ade80",
  labelColor: "#16a34a",
}

interface Props {
  screen: RFDeviceScreen
  /** Current user input value — displayed in the active cursor field */
  inputValue: string
  /**
   * Screen color + font config from the active device model.
   * If omitted the component falls back to the terminal-green aesthetic.
   */
  screenConfig?: RFDeviceScreenConfig
}

export function RFDeviceDisplay({ screen, inputValue, screenConfig }: Props) {
  const cfg = screenConfig ?? TERMINAL_DEFAULTS

  return (
    <div
      className="rounded text-sm leading-6 p-3 min-h-[180px] select-none"
      style={{
        backgroundColor: cfg.bgColor,
        color: cfg.textColor,
        fontFamily: cfg.fontFamily,
      }}
    >
      {screen.lines.map((line, i) => (
        <DisplayLine
          key={i}
          line={line}
          inputValue={line.isCursorField ? inputValue : ""}
          cfg={cfg}
        />
      ))}
    </div>
  )
}

function DisplayLine({
  line,
  inputValue,
  cfg,
}: {
  line: RFScreenLine
  inputValue: string
  cfg: RFDeviceScreenConfig
}) {
  if (line.isCursorField) {
    return (
      <div className="flex" style={{ color: cfg.textColor }}>
        {line.label && (
          <span className="mr-1" style={{ color: cfg.labelColor }}>
            {line.label}
          </span>
        )}
        <span
          className="min-w-[10ch] inline-block border-b"
          style={{ color: cfg.cursorColor, borderColor: cfg.cursorColor }}
        >
          {inputValue || <span className="opacity-40">_</span>}
        </span>
      </div>
    )
  }

  return (
    <div style={{ color: line.isHighlighted ? cfg.highlightColor : cfg.textColor, fontWeight: line.isHighlighted ? "bold" : undefined }}>
      {line.label && (
        <span style={{ color: cfg.labelColor }}>{line.label}&nbsp;</span>
      )}
      {line.value && <span>{line.value}</span>}
      {!line.label && !line.value && <>&nbsp;</>}
    </div>
  )
}
