/**
 * SoftKeyBar — RF Device programmable function key row
 *
 * Renders the six soft keys shown below the screen on physical RF terminals
 * (CTRL+T, CTRL+E, CTRL+A, CTRL+K, CTRL+W, ENTER).
 *
 * This component never decides what action to dispatch — it calls onKey()
 * and the parent (RFDevice) routes to the correct EngineAction.
 *
 * Per CLAUDE.md §Architecture: components render only.
 * Per CLAUDE.md §Canonical Domain Vocabulary: CTRL+T, CTRL+E, CTRL+A, CTRL+K, CTRL+W
 */
"use client"

interface SoftKeyDef {
  shortLabel: string
  fullLabel: string
  keys: string
}

const SOFT_KEYS: SoftKeyDef[] = [
  { shortLabel: "^T", fullLabel: "Task Grp", keys: "CTRL+T" },
  { shortLabel: "^E", fullLabel: "Finalize", keys: "CTRL+E" },
  { shortLabel: "^A", fullLabel: "Accept", keys: "CTRL+A" },
  { shortLabel: "^K", fullLabel: "Skip", keys: "CTRL+K" },
  { shortLabel: "^W", fullLabel: "Back", keys: "CTRL+W" },
  { shortLabel: "ENT", fullLabel: "Enter", keys: "ENTER" },
]

interface Props {
  onKey: (keys: string) => void
  disabled?: boolean
}

export function SoftKeyBar({ onKey, disabled = false }: Props) {
  return (
    <div className="grid grid-cols-6 gap-1">
      {SOFT_KEYS.map((key) => (
        <button
          key={key.keys}
          onClick={() => onKey(key.keys)}
          disabled={disabled}
          className="
            bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500
            text-xs font-mono py-2 px-0 rounded
            border border-zinc-600
            disabled:opacity-40 disabled:cursor-not-allowed
            flex flex-col items-center gap-0.5
            transition-colors
          "
          title={key.keys}
        >
          <span className="text-green-300 font-bold text-[11px]">
            {key.shortLabel}
          </span>
          <span className="text-zinc-500 text-[8px] leading-none">
            {key.fullLabel}
          </span>
        </button>
      ))}
    </div>
  )
}
