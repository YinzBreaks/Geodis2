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

interface Props {
  screen: RFDeviceScreen
  /** Current user input value — displayed in the active cursor field */
  inputValue: string
}

export function RFDeviceDisplay({ screen, inputValue }: Props) {
  return (
    <div className="bg-gray-950 rounded font-mono text-sm leading-6 p-3 min-h-[180px] border border-zinc-700 select-none">
      {screen.lines.map((line, i) => (
        <DisplayLine
          key={i}
          line={line}
          inputValue={line.isCursorField ? inputValue : ""}
        />
      ))}
    </div>
  )
}

function DisplayLine({
  line,
  inputValue,
}: {
  line: RFScreenLine
  inputValue: string
}) {
  const textClass = line.isHighlighted
    ? "text-yellow-300 font-bold"
    : "text-green-400"

  if (line.isCursorField) {
    return (
      <div className={`${textClass} flex`}>
        {line.label && (
          <span className="text-green-600 mr-1">{line.label}</span>
        )}
        <span className="border-b border-green-500 min-w-[10ch] text-green-300 inline-block">
          {inputValue || <span className="opacity-40">_</span>}
        </span>
      </div>
    )
  }

  return (
    <div className={textClass}>
      {line.label && (
        <span className="text-green-600">{line.label}&nbsp;</span>
      )}
      {line.value && <span>{line.value}</span>}
      {!line.label && !line.value && <>&nbsp;</>}
    </div>
  )
}
