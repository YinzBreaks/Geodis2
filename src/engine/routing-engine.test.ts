/**
 * routing-engine.test.ts
 *
 * Unit tests for Serpentine Routing & Spatial Traversal Engine (Day 2).
 *
 * Verifies:
 * 1. Physical Aisle Metric Model (corridor cross width w_aisle = 3.0m)
 * 2. Monotonic bay progression and backtracking event detection
 * 3. Path efficiency calculation (optimal vs actual distance)
 * 4. Pick cadence Coefficient of Variation (CV = sigma / mu)
 * 5. Day 2 qualification gating logic
 * 6. Scorer integration with Day 2 metrics
 */

import { describe, it, expect } from "vitest"
import {
  calculatePointDistance,
  calculatePathDistance,
  detectBacktrack,
  calculatePathEfficiency,
  calculateCadenceCv,
  evaluateTraversal,
  evaluateDay2PassGate,
  getBayNumber,
  getLevelIndex,
  AISLE_CROSS_WIDTH_METERS,
} from "@/engine/routing-engine"
import { calculateScore, computeSessionResult } from "@/engine/scorer"
import {
  DAY2_LOCATIONS,
  day2Scenario,
  day2PickQueue,
  day2Cart,
} from "@/data/scenarios/day2SerpentineRouting"
import {
  WorkflowStep,
  ScanResult,
} from "@/types/domain"

describe("Serpentine Routing Engine", () => {
  describe("Physical Aisle Metric Model", () => {
    it("calculates longitudinal distance without crossing penalty for same-side movements", () => {
      const loc1 = DAY2_LOCATIONS["loc-316-01-A-01"].spatial! // y = 10, LEFT
      const loc2 = DAY2_LOCATIONS["loc-316-02-A-01"].spatial! // y = 30, LEFT

      const dist = calculatePointDistance(loc1, loc2)
      // delta_y = |30 - 10| = 20m
      expect(dist).toBe(20)
    })

    it("adds physical corridor cross width (w_aisle = 3.0m) when crossing between left and right racks", () => {
      const locLeft = DAY2_LOCATIONS["loc-316-01-A-01"].spatial! // y = 10, LEFT
      const locRight = DAY2_LOCATIONS["loc-316-01-A-02"].spatial! // y = 10, RIGHT

      const dist = calculatePointDistance(locLeft, locRight)
      // delta_y = 0 + 3.0m cross width = 3.0m
      expect(dist).toBe(AISLE_CROSS_WIDTH_METERS)

      const locRightBay2 = DAY2_LOCATIONS["loc-316-02-A-02"].spatial! // y = 30, RIGHT
      const distCrossBay = calculatePointDistance(locLeft, locRightBay2)
      // delta_y = 20m + 3.0m = 23m
      expect(distCrossBay).toBe(23)
    })

    it("calculates total path distance correctly across multiple waypoints", () => {
      const coords = [
        DAY2_LOCATIONS["loc-316-01-A-01"].spatial!, // 10, L
        DAY2_LOCATIONS["loc-316-01-B-01"].spatial!, // 10, L (dist: 0)
        DAY2_LOCATIONS["loc-316-02-A-01"].spatial!, // 30, L (dist: 20)
        DAY2_LOCATIONS["loc-316-02-A-02"].spatial!, // 30, R (dist: 3)
      ]
      const totalDist = calculatePathDistance(coords)
      expect(totalDist).toBe(23)
    })
  })

  describe("Monotonic Bay Progression & Backtracking Detection", () => {
    it("permits forward bay progression without triggering backtracking", () => {
      const bay1 = DAY2_LOCATIONS["loc-316-01-A-01"]
      const bay2 = DAY2_LOCATIONS["loc-316-02-A-01"]
      const bay3 = DAY2_LOCATIONS["loc-316-03-A-01"]

      expect(detectBacktrack(bay1, bay2, 1)).toBeNull()
      expect(detectBacktrack(bay2, bay3, 2)).toBeNull()
    })

    it("detects BAY_REGRESSION when jumping back to an earlier bay", () => {
      const bay3 = DAY2_LOCATIONS["loc-316-03-A-01"]
      const bay1 = DAY2_LOCATIONS["loc-316-01-A-01"]

      // Picker was at Bay 3 (maxBay = 3), but scans a location in Bay 1
      const bt = detectBacktrack(bay3, bay1, 3)
      expect(bt).not.toBeNull()
      expect(bt?.reason).toBe("BAY_REGRESSION")
      expect(bt?.fromBay).toBe(3)
      expect(bt?.toBay).toBe(1)
    })

    it("detects LEVEL_REGRESSION when reversing from Level B to Level A in the same bay", () => {
      const bay2LevelB = DAY2_LOCATIONS["loc-316-02-B-01"]
      const bay2LevelA = DAY2_LOCATIONS["loc-316-02-A-01"]

      const bt = detectBacktrack(bay2LevelB, bay2LevelA, 2)
      expect(bt).not.toBeNull()
      expect(bt?.reason).toBe("LEVEL_REGRESSION")
      expect(bt?.fromBay).toBe(2)
      expect(bt?.toBay).toBe(2)
    })

    it("allows bottom-up Level A to Level B progression within the same bay", () => {
      const bay2LevelA = DAY2_LOCATIONS["loc-316-02-A-01"]
      const bay2LevelB = DAY2_LOCATIONS["loc-316-02-B-01"]

      expect(detectBacktrack(bay2LevelA, bay2LevelB, 2)).toBeNull()
    })
  })

  describe("Path Efficiency & Cadence Telemetry", () => {
    it("computes 100% path efficiency when actual distance equals optimal distance", () => {
      const efficiency = calculatePathEfficiency(60, 60)
      expect(efficiency).toBe(100)
    })

    it("penalizes efficiency when extra travel distance is accumulated", () => {
      // Optimal = 60m, Actual = 80m -> 60/80 = 75%
      const efficiency = calculatePathEfficiency(80, 60)
      expect(efficiency).toBe(75)
    })

    it("calculates cadence CV with guard against <3 timestamps", () => {
      expect(calculateCadenceCv([])).toBe(0.0)
      expect(calculateCadenceCv([Date.now()])).toBe(0.0)
      expect(calculateCadenceCv([Date.now(), Date.now() + 5000])).toBe(0.0)
    })

    it("computes low CV for steady metronomic cadence", () => {
      const base = 1000000
      // Intervals: 10s, 10s, 10s, 10s, 10s (perfect rhythm)
      const timestamps = [
        base,
        base + 10000,
        base + 20000,
        base + 30000,
        base + 40000,
      ]
      const cv = calculateCadenceCv(timestamps)
      expect(cv).toBe(0.0)
    })

    it("computes high CV for irregular hesitation cadence", () => {
      const base = 1000000
      // Intervals: 5s, 45s, 6s, 50s (highly erratic)
      const timestamps = [
        base,
        base + 5000,
        base + 50000,
        base + 56000,
        base + 106000,
      ]
      const cv = calculateCadenceCv(timestamps)
      expect(cv).toBeGreaterThan(0.3)
    })
  })

  describe("Day 2 Programmatic Qualification Gate", () => {
    it("qualifies trainee meeting all 4 criteria", () => {
      const qualified = evaluateDay2PassGate(
        {
          optimalDistance: 100,
          actualDistance: 102,
          efficiencyScore: 98,
          backtracks: [],
          cadenceCv: 0.18,
        },
        99.5
      )
      expect(qualified).toBe(true)
    })

    it("fails trainee if any backtracking event occurred", () => {
      const failed = evaluateDay2PassGate(
        {
          optimalDistance: 100,
          actualDistance: 102,
          efficiencyScore: 98,
          backtracks: [
            {
              eventId: "bt-1",
              fromLocationId: "loc-3",
              fromDisplayLabel: "316-03-A-01",
              fromBay: 3,
              toLocationId: "loc-1",
              toDisplayLabel: "316-01-A-01",
              toBay: 1,
              distanceTraveled: 40,
              timestamp: new Date(),
              reason: "BAY_REGRESSION",
            },
          ],
          cadenceCv: 0.18,
        },
        99.5
      )
      expect(failed).toBe(false)
    })

    it("fails trainee if FTPA is below 99.0%", () => {
      const failed = evaluateDay2PassGate(
        {
          optimalDistance: 100,
          actualDistance: 100,
          efficiencyScore: 100,
          backtracks: [],
          cadenceCv: 0.15,
        },
        97.5 // Below 99.0%
      )
      expect(failed).toBe(false)
    })
  })

  describe("Scorer Integration with Day 2 Telemetry", () => {
    it("computes pathEfficiency, backtrackViolations, cadenceVariance, and day2Passed in scorer", () => {
      const session = {
        sessionId: "sess-d2-001",
        userId: "user-001",
        scenarioId: day2Scenario.moduleId,
        moduleId: day2Scenario.moduleId,
        currentStep: WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
        difficulty: day2Scenario.difficulty,
        currentPickIndex: 14,
        pickQueue: day2PickQueue,
        completedPicks: day2PickQueue.map((t, i) => ({
          pickTaskId: t.pickTaskId,
          item: t.item,
          quantityPicked: 1,
          scannedAt: new Date(1000000 + i * 12000), // 12s steady intervals
        })),
        cart: day2Cart,
        toteStack: [],
        currentToteSlot: 1 as const,
        scanEvents: day2PickQueue.map((t) => ({
          scanEventId: `scan-${t.pickTaskId}`,
          sessionId: "sess-d2-001",
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: t.item.upcBarcode,
          scannedValue: t.item.upcBarcode,
          result: ScanResult.SUCCESS,
          timestamp: new Date(),
          responseTimeMs: 1200,
        })),
        errors: [],
        startedAt: new Date(1000000),
        completedAt: new Date(1000000 + 14 * 12000),
        totalTimeMs: 14 * 12000,
        status: "COMPLETED" as const,
        pathEfficiency: 98,
        backtrackViolations: 0,
      }

      const score = calculateScore(session, day2Scenario)
      expect(score.pathEfficiency).toBe(98)
      expect(score.backtrackViolations).toBe(0)
      expect(score.cadenceVariance).toBe(0.0)
      expect(score.day2Passed).toBe(true)

      const result = computeSessionResult(session, day2Scenario)
      expect(result.day2Passed).toBe(true)
      expect(result.pathEfficiency).toBe(98)
    })
  })
})
