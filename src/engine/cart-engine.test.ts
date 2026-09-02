/**
 * cart-engine.test.ts
 *
 * Unit tests for 9-Tote Cluster Cart State Engine, Vertical Tier Validation,
 * and Day 3 Competency Gating.
 */

import { describe, it, expect } from "vitest"
import {
  getSlotTier,
  getTierSlots,
  getTierName,
  validatePutToSlot,
  calculateTotePutAccuracy,
  calculateMeanTotePutLatency,
  evaluateDay3PassGate,
  computeCartSlotFillStatus,
} from "@/engine/cart-engine"
import {
  day3Scenario,
  day3PickQueue,
  day3Cart,
  DAY3_LOCATIONS,
} from "@/data/scenarios/day3HighDensityWave"
import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
} from "@/types/domain"
import { calculateScore, computeSessionResult } from "@/engine/scorer"
import { isActionPermitted } from "@/engine/validators"

describe("9-Tote Cluster Cart State Engine", () => {
  describe("Cart Tier Orientation & Slot Mapping", () => {
    it("maps slots 1, 2, 3 to Tier 1 (Bottom Shelf)", () => {
      expect(getSlotTier(1)).toBe(1)
      expect(getSlotTier(2)).toBe(1)
      expect(getSlotTier(3)).toBe(1)
      expect(getTierSlots(1)).toEqual([1, 2, 3])
      expect(getTierName(1)).toContain("Bottom Shelf")
    })

    it("maps slots 4, 5, 6 to Tier 2 (Middle Shelf / Golden Zone)", () => {
      expect(getSlotTier(4)).toBe(2)
      expect(getSlotTier(5)).toBe(2)
      expect(getSlotTier(6)).toBe(2)
      expect(getTierSlots(2)).toEqual([4, 5, 6])
      expect(getTierName(2)).toContain("Middle Shelf")
    })

    it("maps slots 7, 8, 9 to Tier 3 (Top Shelf / Shoulder Height)", () => {
      expect(getSlotTier(7)).toBe(3)
      expect(getSlotTier(8)).toBe(3)
      expect(getSlotTier(9)).toBe(3)
      expect(getTierSlots(3)).toEqual([7, 8, 9])
      expect(getTierName(3)).toContain("Top Shelf")
    })
  })

  describe("Put-to-Slot Routing & Mis-Slot Detection", () => {
    function createMockSession(): SimulationSession {
      return {
        sessionId: "sess-d3-test",
        userId: "user-test",
        scenarioId: day3Scenario.moduleId,
        moduleId: day3Scenario.moduleId,
        currentStep: WorkflowStep.PK_SCAN_TOTE_BARCODE,
        difficulty: day3Scenario.difficulty,
        currentPickIndex: 7, // Pick 8 targets Slot 8 (Tier 3 Top)
        pickQueue: day3PickQueue,
        completedPicks: [],
        cart: day3Cart,
        toteStack: [],
        currentToteSlot: 1,
        scanEvents: [],
        errors: [],
        startedAt: new Date(),
        status: "IN_PROGRESS",
      }
    }

    it("accepts exact matching tote barcode for assigned slot", () => {
      const session = createMockSession()
      // Pick 8 targets Slot 8 -> expects TOTE-08
      const res = validatePutToSlot(session, "TOTE-08")
      expect(res.isValid).toBe(true)
      expect(res.targetSlot).toBe(8)
      expect(res.targetTier).toBe(3)
    })

    it("flags MIS_SLOT_ATTEMPT when scanning another active cart tote", () => {
      const session = createMockSession()
      // Target is Slot 8 (Tier 3 Top), but user scans TOTE-05 (Slot 5, Tier 2 Middle)
      const res = validatePutToSlot(session, "TOTE-05")
      expect(res.isValid).toBe(false)
      expect(res.error).toBe("MIS_SLOT_ATTEMPT")
      expect(res.feedback).toContain("Mis-slot detected")
      expect(res.feedback).toContain("Slot 5")
      expect(res.feedback).toContain("Slot 8")
    })

    it("flags TOTE_NOT_FOUND when scanning an unallocated or invalid barcode", () => {
      const session = createMockSession()
      const res = validatePutToSlot(session, "TOTE-999")
      expect(res.isValid).toBe(false)
      expect(res.error).toBe("TOTE_NOT_FOUND")
      expect(res.feedback).toContain("Invalid tote barcode")
    })

    it("computes live slot fill status across all 9 totes", () => {
      const session = createMockSession()
      const statuses = computeCartSlotFillStatus(session)
      expect(statuses).toHaveLength(9)
      const slot8 = statuses.find((s) => s.slot === 8)
      expect(slot8?.isTarget).toBe(true)
      expect(slot8?.tier).toBe(3)
    })
  })

  describe("Tote Put Latency & Accuracy Telemetry", () => {
    it("calculates 100% accuracy when 0 mis-slots occur", () => {
      expect(calculateTotePutAccuracy(24, 0)).toBe(100)
    })

    it("penalizes tote put accuracy when mis-slot attempts occur", () => {
      // 24 / 25 = 96.0%
      expect(calculateTotePutAccuracy(24, 1)).toBe(96.0)
    })

    it("calculates mean tote put latency in seconds", () => {
      expect(calculateMeanTotePutLatency([])).toBe(0.0)
      expect(calculateMeanTotePutLatency([1500, 2100, 2400])).toBe(2.0)
    })
  })

  describe("Day 3 Qualification Gating", () => {
    it("qualifies when all 4 Day 3 criteria are met", () => {
      const passed = evaluateDay3PassGate(
        100, // 100% tote accuracy
        2.1, // <= 2.5s put latency
        99.5, // >= 99.2% FTPA
        132 // >= 120 UPH
      )
      expect(passed).toBe(true)
    })

    it("fails if any mis-slot occurred (accuracy < 100%)", () => {
      const passed = evaluateDay3PassGate(96.0, 2.1, 99.5, 132)
      expect(passed).toBe(false)
    })

    it("fails if mean put latency exceeds 2.5s SLA", () => {
      const passed = evaluateDay3PassGate(100, 2.7, 99.5, 132)
      expect(passed).toBe(false)
    })

    it("fails if vertical tier FTPA is below 99.2%", () => {
      const passed = evaluateDay3PassGate(100, 2.1, 98.8, 132)
      expect(passed).toBe(false)
    })

    it("fails if sustained UPH is below 120", () => {
      const passed = evaluateDay3PassGate(100, 2.1, 99.5, 114)
      expect(passed).toBe(false)
    })
  })

  describe("Vertical Tier Check-Digit Mismatch Guardrail", () => {
    it("blocks and returns tier mismatch feedback when check digit from another tier is scanned", () => {
      const session: SimulationSession = {
        sessionId: "sess-v-test",
        userId: "user-test",
        scenarioId: day3Scenario.moduleId,
        moduleId: day3Scenario.moduleId,
        currentStep: WorkflowStep.PK_VERIFY_LOCATION,
        difficulty: day3Scenario.difficulty,
        currentPickIndex: 3, // Pick 4: Bay 01 Level D (CD: 14)
        pickQueue: day3PickQueue,
        completedPicks: [],
        cart: day3Cart,
        toteStack: [],
        currentToteSlot: 1,
        scanEvents: [],
        errors: [],
        startedAt: new Date(),
        status: "IN_PROGRESS",
      }

      // User scans check digit [83], which belongs to Bay 01 Level B instead of Level D
      const feedback = isActionPermitted(session, {
        type: "SCAN",
        value: "83",
      })

      expect(feedback).not.toBeNull()
      expect(feedback).toContain("Vertical tier mismatch")
      expect(feedback).toContain("Level B")
      expect(feedback).toContain("Level D")
    })
  })

  describe("Scorer Integration with Day 3 Telemetry", () => {
    it("computes totePutAccuracy, meanTotePutLatencySeconds, verticalTierFtpa, sustainedUph, and day3Passed", () => {
      const session: SimulationSession = {
        sessionId: "sess-d3-001",
        userId: "user-001",
        scenarioId: day3Scenario.moduleId,
        moduleId: day3Scenario.moduleId,
        currentStep: WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
        difficulty: day3Scenario.difficulty,
        currentPickIndex: 24,
        pickQueue: day3PickQueue,
        completedPicks: day3PickQueue.map((t, i) => ({
          pickTaskId: t.pickTaskId,
          item: t.item,
          quantityPicked: 1,
          scannedAt: new Date(1000000 + i * 10000),
        })),
        cart: day3Cart,
        toteStack: [],
        currentToteSlot: 1,
        scanEvents: day3PickQueue.map((t) => ({
          scanEventId: `scan-${t.pickTaskId}`,
          sessionId: "sess-d3-001",
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: t.item.upcBarcode,
          scannedValue: t.item.upcBarcode,
          result: ScanResult.SUCCESS,
          timestamp: new Date(),
          responseTimeMs: 1100,
        })),
        errors: [],
        startedAt: new Date(1000000),
        completedAt: new Date(1000000 + 24 * 10000), // 240 seconds total
        totalTimeMs: 240000,
        status: "COMPLETED",
        totePutLatencies: [1800, 1900, 2100, 2000, 1800],
        misSlotAttempts: 0,
      }

      const score = calculateScore(session, day3Scenario)
      expect(score.totePutAccuracy).toBe(100)
      expect(score.meanTotePutLatencySeconds).toBe(1.92)
      expect(score.verticalTierFtpa).toBe(100)
      expect(score.sustainedUph).toBeGreaterThanOrEqual(120)
      expect(score.day3Passed).toBe(true)

      const result = computeSessionResult(session, day3Scenario)
      expect(result.day3Passed).toBe(true)
      expect(result.totePutAccuracy).toBe(100)
      expect(result.meanTotePutLatencySeconds).toBe(1.92)
    })
  })
})
