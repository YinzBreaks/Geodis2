import { describe, expect, it } from "vitest"
import { SCENARIO_DATA } from "@/data/seedData"
import { validateScenarioBundle } from "@/data/scenario-contract"

describe("simulation scenario contracts", () => {
  for (const [key, bundle] of Object.entries(SCENARIO_DATA)) {
    it(`${key} is production compliant`, () => {
      expect(validateScenarioBundle(key, bundle)).toEqual([])
    })
  }
})

/**
 * Per BBWD-WI-030 §5.2.11 a picker repeats picks into the SAME tote until it is
 * full and "End Of Tote" is displayed, then moves to the next tote. A pick queue
 * that interleaves slots makes the engine fire End Of Tote — and a conveyor
 * trip — after every single pick, which is what a round-robin `i % 9` queue did.
 */
describe("pick queues fill one tote at a time", () => {
  for (const [key, bundle] of Object.entries(SCENARIO_DATA)) {
    // Cluster batch waves (e.g. Day 2) intentionally interleave picks across active cart totes
    const isCluster =
      bundle.scenario.moduleId.startsWith("day2") ||
      Boolean((bundle.scenario as { isClusterWave?: boolean }).isClusterWave)

    it(`${key} never returns to a tote after moving on`, () => {
      if (isCluster) return
      const finished = new Set<number>()
      let currentSlot: number | null = null

      for (const pick of bundle.pickQueue) {
        if (pick.targetSlot === currentSlot) continue
        expect(
          finished.has(pick.targetSlot),
          `slot ${pick.targetSlot} is revisited after the queue moved past it`
        ).toBe(false)
        if (currentSlot !== null) finished.add(currentSlot)
        currentSlot = pick.targetSlot
      }
    })

    it(`${key} gives every tote more than one pick`, () => {
      const perSlot = new Map<number, number>()
      for (const pick of bundle.pickQueue) {
        perSlot.set(pick.targetSlot, (perSlot.get(pick.targetSlot) ?? 0) + 1)
      }
      for (const [slot, count] of perSlot) {
        expect(count, `slot ${slot} has only ${count} pick`).toBeGreaterThan(1)
      }
    })
  }
})
