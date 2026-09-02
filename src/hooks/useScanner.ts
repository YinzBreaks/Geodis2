/**
 * useScanner — Enterprise Hardware Scanner Wedge Hook
 *
 * Intercepts rapid HID keystroke streams from physical USB/Bluetooth barcode
 * scanners (<40ms inter-keystroke intervals terminating in "Enter") regardless
 * of which element currently has focus.
 *
 * Implements safeguards:
 * - e.preventDefault() ONLY when stream is confirmed as a barcode burst on Enter
 * - Explicit 100ms flush timeout clears stray characters
 * - Does not swallow hotkeys (CTRL+*, ALT+*, META+*)
 * - Provides developer fallbacks for manual keyboard testing
 */

import { useEffect, useRef, useCallback } from "react"
import { useSimulation } from "@/hooks/useSimulation"
import { getExpectedInputType } from "@/lib/stepKeyMap"
import type { InputSource } from "@/engine/process-input"

export interface UseScannerResult {
  /** Dispatch a barcode scan to the simulation engine. */
  scan: (barcode: string, source?: InputSource) => void
  /** Whether the current step expects a scan action. */
  expectsScan: boolean
  /** Developer helper to simulate a rapid hardware wedge scan stream */
  simulateHardwareScan: (barcode: string) => void
}

const INTER_CHAR_THRESHOLD_MS = 40
const FLUSH_TIMEOUT_MS = 100
const MIN_BARCODE_LENGTH = 2

export function useScanner(): UseScannerResult {
  const processInput = useSimulation((s) => s.processInput)
  const currentStep = useSimulation((s) => s.session?.currentStep ?? null)

  const scan = useCallback(
    (barcode: string, source: InputSource = "scanner") => {
      processInput({ type: "SCAN", value: barcode, source })
    },
    [processInput]
  )

  const simulateHardwareScan = useCallback(
    (barcode: string) => {
      scan(barcode, "scanner")
    },
    [scan]
  )

  // Buffer state stored in refs to avoid re-binding event listener
  const bufferRef = useRef<string>("")
  const lastTimeRef = useRef<number>(0)
  const isBurstRef = useRef<boolean>(false)
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Expose developer helper on window
    if (typeof window !== "undefined") {
      ;(
        window as unknown as { __simulateHardwareScan?: (b: string) => void }
      ).__simulateHardwareScan = simulateHardwareScan
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Never intercept modifier hotkeys (CTRL+K, CTRL+E, CTRL+T, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
        bufferRef.current = ""
        isBurstRef.current = false
        return
      }

      const now = Date.now()
      const delta = now - lastTimeRef.current
      lastTimeRef.current = now

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
      }

      if (e.key === "Enter") {
        if (isBurstRef.current && bufferRef.current.length >= MIN_BARCODE_LENGTH) {
          // Confirmed hardware scanner burst!
          e.preventDefault()
          e.stopPropagation()
          const scannedValue = bufferRef.current.trim()
          bufferRef.current = ""
          isBurstRef.current = false
          if (scannedValue) {
            scan(scannedValue, "scanner")
          }
          return
        }
        // Human typing or standard Enter — flush buffer and allow default behavior
        bufferRef.current = ""
        isBurstRef.current = false
        return
      }

      // Printable single characters
      if (e.key.length === 1) {
        if (bufferRef.current.length === 0) {
          // First character of potential burst
          bufferRef.current = e.key
          isBurstRef.current = false
        } else if (delta <= INTER_CHAR_THRESHOLD_MS) {
          // Rapid keystroke detected!
          bufferRef.current += e.key
          isBurstRef.current = true
        } else {
          // Inter-character interval > 40ms: user typing manually
          bufferRef.current = e.key
          isBurstRef.current = false
        }

        // Set safety flush timeout to avoid pollution from abandoned characters
        flushTimerRef.current = setTimeout(() => {
          bufferRef.current = ""
          isBurstRef.current = false
        }, FLUSH_TIMEOUT_MS)
      }
    }

    window.addEventListener("keydown", handleKeyDown, { capture: true })

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    }
  }, [scan, simulateHardwareScan])

  return {
    scan,
    expectsScan: currentStep !== null && getExpectedInputType(currentStep) === "scan",
    simulateHardwareScan,
  }
}
