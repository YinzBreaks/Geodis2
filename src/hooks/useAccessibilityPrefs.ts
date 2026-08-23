/**
 * useAccessibilityPrefs — persisted display accessibility settings
 *
 * Mirrors the localStorage pattern used for the language toggle in
 * src/app/sim/page.tsx (key: warehousepro.lang), but for a JSON blob of
 * three independent toggles: dyslexia-friendly font, reduced motion, and
 * high contrast. Each toggle maps 1:1 to a CSS class applied by the caller
 * (dyslexia-mode / reduced-motion / high-contrast, see globals.css).
 */
"use client"

import { useEffect, useState } from "react"

export interface AccessibilityPrefs {
  dyslexiaFont: boolean
  reducedMotion: boolean
  highContrast: boolean
}

const STORAGE_KEY = "warehousepro.a11y"

const DEFAULT_PREFS: AccessibilityPrefs = {
  dyslexiaFont: false,
  reducedMotion: false,
  highContrast: false,
}

function readStoredPrefs(): AccessibilityPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw)
    return {
      dyslexiaFont: Boolean(parsed.dyslexiaFont),
      reducedMotion: Boolean(parsed.reducedMotion),
      highContrast: Boolean(parsed.highContrast),
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function useAccessibilityPrefs() {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    setPrefs(readStoredPrefs())
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  }, [prefs])

  const toggle = (key: keyof AccessibilityPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return { prefs, toggle }
}
