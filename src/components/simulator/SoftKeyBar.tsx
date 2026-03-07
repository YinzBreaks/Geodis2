/**
 * SoftKeyBar — RF Device programmable function key row
 *
 * Renders the six soft keys shown below the screen on physical RF terminals
 * (CTRL+T, CTRL+E, CTRL+A, CTRL+K, CTRL+W, ENTER).
 *
 * Styling is driven by the device's uiStyle — "terminal" renders the
 * classic green-on-dark look; "android" renders the clean slate WMS look.
 * Never hardcode colors here — use the uiStyle prop.
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
  /**
   * Device rendering style — governs button colors.
   * "android" → slate/blue WMS look (TC520K)
   * "terminal" → zinc/green terminal look (CK65, TC52)
   * Defaults to "terminal" for backward compatibility.
   */
  uiStyle?: "terminal" | "android"
}

export function SoftKeyBar({ onKey, disabled = false, uiStyle = "terminal" }: Props) {
  const isAndroid = uiStyle === "android"

  return (
    <div className="grid grid-cols-6 gap-1">
      {SOFT_KEYS.map((key) => (
        <button
          key={key.keys}
          onClick={() => onKey(key.keys)}
          disabled={disabled}
          className={`
            text-xs font-mono py-2 px-0 rounded border
            disabled:opacity-40 disabled:cursor-not-allowed
            flex flex-col items-center gap-0.5
            transition-colors
            ${
              isAndroid
                ? "bg-slate-100 hover:bg-blue-50 active:bg-blue-100 border-slate-300"
                : "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 border-zinc-600"
            }
          `}
          title={key.keys}
        >
          <span
            className={`font-bold text-[11px] ${
              isAndroid ? "text-slate-700" : "text-green-300"
            }`}
          >
            {key.shortLabel}
          </span>
          <span
            className={`text-[8px] leading-none ${
              isAndroid ? "text-slate-400" : "text-zinc-500"
            }`}
          >
            {key.fullLabel}
          </span>
        </button>
      ))}
    </div>
  )
}
