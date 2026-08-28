/**
 * AccessibilityMenu — popover with large, text-labeled accessibility toggles
 *
 * Each toggle shows its state as explicit "On"/"Off" text (not color alone)
 * per WCAG guidance for not conveying state through color only.
 */
"use client"

import type { AccessibilityPrefs } from "@/hooks/useAccessibilityPrefs"

interface AccessibilityMenuProps {
  prefs: AccessibilityPrefs
  onToggle: (key: keyof AccessibilityPrefs) => void
  onClose: () => void
}

const TOGGLES: Array<{ key: keyof AccessibilityPrefs; label: string; description: string }> = [
  {
    key: "dyslexiaFont",
    label: "Dyslexia-friendly font",
    description: "Switches body text to a more legible, rounded font.",
  },
  {
    key: "reducedMotion",
    label: "Reduce motion",
    description: "Turns off bouncing and pulsing animations.",
  },
  {
    key: "highContrast",
    label: "High contrast",
    description: "Uses pure black and white for maximum contrast.",
  },
  {
    key: "muteAudio",
    label: "Mute sounds",
    description: "Silences scan beeps, error buzzes, and completion chimes.",
  },
]

export function AccessibilityMenu({ prefs, onToggle, onClose }: AccessibilityMenuProps) {
  return (
    <div
      role="dialog"
      aria-label="Accessibility settings"
      className="absolute right-4 top-full mt-2 z-30 w-[320px] bg-slate-900 border-2 border-slate-600 rounded-lg shadow-xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-100">Accessibility settings</span>
        <button
          type="button"
          onClick={onClose}
          className="touch-target px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 border border-slate-700"
        >
          Close
        </button>
      </div>

      {TOGGLES.map((item) => {
        const isOn = prefs[item.key]
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            aria-pressed={isOn}
            className="touch-target w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-100">{item.label}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{item.description}</span>
            </span>
            <span
              className={`shrink-0 px-2.5 py-1 rounded text-xs font-bold ${
                isOn ? "bg-amber-500 text-slate-950" : "bg-slate-700 text-slate-300"
              }`}
            >
              {isOn ? "On" : "Off"}
            </span>
          </button>
        )
      })}
    </div>
  )
}
