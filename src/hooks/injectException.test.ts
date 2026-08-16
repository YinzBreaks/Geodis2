/**
 * injectException.test.ts — Tests for live exception injection (Phase 11)
 *
 * Verifies that the store's injectException action appends a correctly-formed
 * ErrorScenario to the live scenario at the current pick index, and that the
 * pure engine's getInjectedError subsequently fires it — proving the engine
 * itself is untouched by the injection mechanism.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useSimulation } from "@/hooks/useSimulation"
import { getInjectedError } from "@/engine/error-injector"
import { ScanResult } from "@/types/domain"

describe("injectException (store action)", () => {
  beforeEach(() => {
    useSimulation.getState().reset()
    useSimulation.getState().startSimulation("Z1_10_PICKS")
  })

  it("appends an ErrorScenario at the current pick index", () => {
    const before = useSimulation.getState().scenario!.errorScenarios.length
    useSimulation.getState().injectException(ScanResult.TOTE_ALLOCATED)
    const after = useSimulation.getState().scenario!.errorScenarios
    expect(after.length).toBe(before + 1)
    const injected = after[after.length - 1]
    expect(injected.errorType).toBe(ScanResult.TOTE_ALLOCATED)
    expect(injected.injectAtPickIndex).toBe(
      useSimulation.getState().session!.currentPickIndex
    )
  })

  it("does not double-queue the same exception at the same pick index", () => {
    useSimulation.getState().injectException(ScanResult.WRONG_ITEM)
    const after1 = useSimulation.getState().scenario!.errorScenarios.length
    useSimulation.getState().injectException(ScanResult.WRONG_ITEM)
    const after2 = useSimulation.getState().scenario!.errorScenarios.length
    expect(after2).toBe(after1)
  })

  it("is fired by the pure engine's getInjectedError after injection", () => {
    useSimulation.getState().injectException(ScanResult.ITEM_NOT_FOUND)
    const { session, scenario } = useSimulation.getState()
    const injected = getInjectedError(session!, scenario!)
    expect(injected).not.toBeNull()
    expect(injected!.scanResult).toBe(ScanResult.ITEM_NOT_FOUND)
  })

  it("no-ops safely when no session is active", () => {
    useSimulation.getState().reset()
    expect(() =>
      useSimulation.getState().injectException(ScanResult.CART_ALLOCATED)
    ).not.toThrow()
    expect(useSimulation.getState().scenario).toBeNull()
  })
})
