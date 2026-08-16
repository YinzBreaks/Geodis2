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
