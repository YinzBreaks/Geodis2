/**
 * useScanner — Thin wrapper hook for scan event dispatch
 *
 * Per CLAUDE.md §Architecture: `useScanner` is the ONLY way components
 * interact with scan events. Centralizes barcode scan dispatch so
 * components never construct { type: "SCAN" } actions directly.
 *
 * Consumes the Zustand simulation store and exposes a single `scan()`
 * function plus the current scan-relevant state.
 */

import { useSimulation } from "@/hooks/useSimulation"
import { getExpectedInputType } from "@/lib/stepKeyMap"
import type { InputSource } from "@/engine/process-input"

/**
 * Hook return shape — scan function + read-only context.
 */
export interface UseScannerResult {
  /** Dispatch a barcode scan to the simulation engine. */
  scan: (barcode: string, source?: InputSource) => void
  /** Whether the current step expects a scan action. */
  expectsScan: boolean
}

/**
 * The ONLY way components should dispatch scan events.
 *
 * @example
 *   const { scan, expectsScan } = useScanner()
 *   if (expectsScan) scan(barcodeValue)
 */
export function useScanner(): UseScannerResult {
  const processInput = useSimulation((s) => s.processInput)
  const currentStep = useSimulation((s) => s.session?.currentStep ?? null)

  return {
    scan: (barcode: string, source: InputSource = "scanner") =>
      processInput({ type: "SCAN", value: barcode, source }),
    expectsScan: currentStep !== null && getExpectedInputType(currentStep) === "scan",
  }
}
