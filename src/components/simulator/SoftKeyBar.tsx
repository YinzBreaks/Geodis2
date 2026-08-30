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
  uiStyle?: "terminal" | "android" | "modern"
  /**
   * When set, the matching soft key gets a pulse animation to guide
   * the trainee's eye. Set from getExpectedKey(currentStep) for key-only steps.
   * Value must match one of SOFT_KEYS[n].keys.
   */
  highlightKey?: string
  /**
   * Per-key enabled state from getSoftKeyEnabled().
   * Keys with value false render at reduced opacity with cursor:not-allowed.
   * ENTER is always enabled regardless (it drives Continue/advance actions).
   * When undefined, all keys are enabled.
   * Per CLAUDE.md §RF Device Configuration: buttons disabled when not valid.
   */
  enabledKeys?: Record<string, boolean>
}

export function SoftKeyBar({ onKey, disabled = false, uiStyle = "terminal", highlightKey, enabledKeys }: Props) {
  const isAndroid = uiStyle === "android"
  const isModern = uiStyle === "modern"

  return (
    <div className="grid grid-cols-6 gap-1">
      {SOFT_KEYS.map((key) => {
        const isHighlighted = highlightKey !== undefined && key.keys === highlightKey
        // ENTER is always enabled; other keys defer to enabledKeys map (undefined = all on)
        const isKeyEnabled =
          disabled
            ? false
            : key.keys === "ENTER"
              ? true
              : enabledKeys === undefined
                ? true
                : (enabledKeys[key.keys] ?? false)

        return (
        <button
          key={key.keys}
          onClick={() => isKeyEnabled && onKey(key.keys)}
          disabled={disabled}
          className={`
            touch-target min-h-[56px] min-w-[56px]
            text-xs font-mono py-1.5 px-0 rounded border
            flex flex-col items-center justify-center gap-0.5
            transition-colors
            ${
              isHighlighted && isKeyEnabled
                ? isModern
                  ? "animate-pulse ring-2 ring-amber-400 ring-offset-1 ring-offset-zinc-900"
                  : "animate-pulse ring-2 ring-green-400 ring-offset-1 ring-offset-zinc-900"
                : ""
            }
            ${
              isModern
                ? (isHighlighted && isKeyEnabled
                    ? "border-amber-500"
                    : "hover:bg-zinc-700 active:bg-zinc-600 border-zinc-600")
                : isAndroid
                  ? (isHighlighted && isKeyEnabled
                      ? "bg-blue-100 border-blue-400"
                      : "bg-slate-100 hover:bg-blue-50 active:bg-blue-100 border-slate-300")
                  : (isHighlighted && isKeyEnabled
                      ? "bg-zinc-600 border-green-500"
                      : "bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-500 border-zinc-600")
            }
          `}
          style={{
            ...(isModern
              ? {
                  backgroundColor: isHighlighted && isKeyEnabled
                    ? "var(--color-amber-glow)"
                    : "var(--color-surface-2)",
                }
              : {}),
            // Bug 4: visually disable keys that are not valid at the current step
            ...(isKeyEnabled
              ? {}
              : {
                  opacity: 0.35,
                  cursor: "not-allowed",
                  pointerEvents: "none" as const,
                }),
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
          title={key.keys}
        >
          <span
            className={`font-bold text-[11px] ${
              isHighlighted && isKeyEnabled
                ? isModern ? "text-amber-400" : "text-green-300"
                : isModern ? "text-amber-400" : isAndroid ? "text-slate-700" : "text-green-300"
            }`}
          >
            {key.shortLabel}
          </span>
          <span
            className={`text-[8px] leading-none ${
              isHighlighted && isKeyEnabled
                ? isModern ? "text-amber-500" : "text-green-500"
                : isModern ? "text-zinc-400" : isAndroid ? "text-slate-400" : "text-zinc-500"
            }`}
          >
            {key.fullLabel}
          </span>
        </button>
        )
      })}
    </div>
  )
}
