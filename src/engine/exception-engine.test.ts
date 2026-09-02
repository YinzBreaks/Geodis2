/**
 * exception-engine.test.ts
 *
 * Unit tests for Day 4 Non-Destructive Exception Engine,
 * Hotkey Interrupts, and Competency Gating.
 */

import { describe, it, expect } from "vitest"
import {
  initiateShortPick,
  processShortPickQty,
  processShortReason,
  initiateManualBarcode,
  processManualBarcode,
  processManualCheckDigit,
  initiateDamageTag,
  confirmDamageTag,
  initiateHazmatAlert,
  confirmHazmatAlert,
  processHazmatRedirect,
  recordPrematureToteDrop,
  calculateMeanExceptionLatency,
  evaluateDay4PassGate,
} from "@/engine/exception-engine"
import {
  day4Scenario,
  day4PickQueue,
  day4Cart,
} from "@/data/scenarios/day4IndustrialExceptions"
import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
} from "@/types/domain"
import { calculateScore, computeSessionResult } from "@/engine/scorer"
import { dispatch } from "@/engine/simulation-engine"

describe("Day 4 Non-Destructive Exception Engine", () => {
  function createMockSession(): SimulationSession {
    return {
      sessionId: "sess-d4-test",
      userId: "user-test",
      scenarioId: day4Scenario.moduleId,
      moduleId: day4Scenario.moduleId,
      moduleType: day4Scenario.contentType,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      difficulty: day4Scenario.difficulty,
      currentPickIndex: 6, // Pick 7: reqQty = 4, targetSlot = 7
      pickQueue: day4PickQueue,
      completedPicks: [],
      cart: day4Cart,
      toteStack: [],
      currentToteSlot: 1,
      scanEvents: [],
      errors: [],
      startedAt: new Date(),
      status: "IN_PROGRESS",
    }
  }

  describe("Short Pick Workflow & Active Tote Retention", () => {
    it("initiates short pick flow when triggered by CTRL+K", () => {
      const session = createMockSession()
      const initiated = initiateShortPick(session)
      expect(initiated.currentStep).toBe(WorkflowStep.EX_SHORT_PICK)
      expect(initiated.activeExceptionBuffer?.type).toBe("SHORT")
      expect(initiated.exceptionStartTimestamp).toBeDefined()
    })

    it("rejects invalid quantities (< 0 or > requested)", () => {
      const session = initiateShortPick(createMockSession())
      const resNeg = processShortPickQty(session, "-1")
      expect(resNeg.error).toBeDefined()

      const resOver = processShortPickQty(session, "10")
      expect(resOver.error).toBeDefined()
    })

    it("routes to EX_SHORT_REASON when found < requested", () => {
      const session = initiateShortPick(createMockSession())
      // requested = 4, found = 2
      const res = processShortPickQty(session, "2")
      expect(res.nextStep).toBe(WorkflowStep.EX_SHORT_REASON)
      expect(res.session.activeExceptionBuffer?.foundQty).toBe(2)
    })

    it("logs IC discrepancy delta, puts items in active tote, and retains tote on cart", () => {
      const session = createMockSession()
      const inShort = initiateShortPick(session)
      const inReason = processShortPickQty(inShort, "2").session

      // Select reason 2: Partial Inventory
      const res = processShortReason(inReason, "2")

      // Active tote MUST remain on cart, advancing to next pick (NOT conveyor dump!)
      expect(res.nextStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)
      expect(res.session.currentPickIndex).toBe(7)
      expect(res.session.currentStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)

      // IC discrepancy audit log
      expect(res.session.inventoryDiscrepancies).toHaveLength(1)
      const disc = res.session.inventoryDiscrepancies![0]
      expect(disc.requestedQty).toBe(4)
      expect(disc.actualFoundQty).toBe(2)
      expect(disc.delta).toBe(2)
      expect(disc.reason).toBe(2)

      // Active tote holds the 2 picked units
      const targetTote = res.session.cart.totes.find((t) => t.slot === 7)
      expect(targetTote?.pickedItems).toHaveLength(1)
      expect(targetTote?.pickedItems[0].quantityPicked).toBe(2)
      expect(targetTote?.placedOnConveyor).toBe(false)
    })
  })

  describe("Degraded Barcode Two-Step Manual Override", () => {
    it("advances from EX_MANUAL_BARCODE to EX_MANUAL_CHECK_DIGIT on valid 12-digit UPC", () => {
      const session = createMockSession()
      session.currentPickIndex = 1 // Pick 2: item-widget-green, UPC 00024505573002, CD 83
      const inManual = initiateManualBarcode(session)
      expect(inManual.currentStep).toBe(WorkflowStep.EX_MANUAL_BARCODE)

      // Valid UPC
      const res = processManualBarcode(inManual, "00024505573002")
      expect(res.nextStep).toBe(WorkflowStep.EX_MANUAL_CHECK_DIGIT)
      expect(res.session.activeExceptionBuffer?.enteredUpc).toBe("00024505573002")
    })

    it("rejects mismatched UPC input at EX_MANUAL_BARCODE", () => {
      const session = createMockSession()
      session.currentPickIndex = 1
      const inManual = initiateManualBarcode(session)

      const res = processManualBarcode(inManual, "999999999999")
      expect(res.error).toBeDefined()
      expect(res.error).toContain("UPC mismatch")
    })

    it("verifies physical shelf check digit before unlocking Beat 3", () => {
      const session = createMockSession()
      session.currentPickIndex = 1 // Location CD: 83
      const inManual = initiateManualBarcode(session)
      const inCd = processManualBarcode(inManual, "00024505573002").session

      // Invalid check digit
      const resBad = processManualCheckDigit(inCd, "12")
      expect(resBad.error).toBeDefined()
      expect(resBad.error).toContain("Check-digit mismatch")

      // Valid check digit
      const resGood = processManualCheckDigit(inCd, "83")
      expect(resGood.nextStep).toBe(WorkflowStep.PK_ENTER_QUANTITY)
      expect(resGood.session.currentStep).toBe(WorkflowStep.PK_ENTER_QUANTITY)
    })
  })

  describe("Damaged Item QA Quarantine Flow", () => {
    it("quarantines item to bad-order bin and advances to next pick without dumping active tote", () => {
      const session = createMockSession()
      session.currentPickIndex = 14 // Pick 15: damaged carton
      const inDamage = initiateDamageTag(session)
      expect(inDamage.currentStep).toBe(WorkflowStep.EX_DAMAGE_TAG)

      const res = confirmDamageTag(inDamage)
      expect(res.nextStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)
      expect(res.session.currentPickIndex).toBe(15)
      expect(res.session.damageQuarantineRecords).toHaveLength(1)
      expect(res.session.damageQuarantineRecords![0].disposition).toBe("BAD_ORDER_BIN")
      expect(res.session.damageQuarantineRecords![0].scheduledIcReplacement).toBe(true)
    })
  })

  describe("Hazmat Incident Alert & Segregation", () => {
    it("locks pick line and requires segregation to TOTE-09-HAZ", () => {
      const session = createMockSession()
      session.currentPickIndex = 17 // Pick 18: Flammable aerosol spill
      const inAlert = initiateHazmatAlert(session)
      expect(inAlert.currentStep).toBe(WorkflowStep.EX_HAZMAT_ALERT)

      const inRedirect = confirmHazmatAlert(inAlert)
      expect(inRedirect.nextStep).toBe(WorkflowStep.EX_HAZMAT_REDIRECT)

      // Rejects standard consumer goods tote
      const resBad = processHazmatRedirect(inRedirect.session, "TOTE-01")
      expect(resBad.error).toBeDefined()
      expect(resBad.error).toContain("TOTE-09-HAZ")

      // Accepts dedicated containment tote
      const resGood = processHazmatRedirect(inRedirect.session, "TOTE-09-HAZ")
      expect(resGood.nextStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)
      expect(resGood.session.currentPickIndex).toBe(18)
      expect(resGood.session.hazmatIncidentRecords).toHaveLength(1)
      expect(resGood.session.hazmatIncidentRecords![0].destinationTote).toBe("TOTE-09-HAZ")
    })
  })

  describe("Premature Tote Drop Blocker & Day 4 Gating", () => {
    it("increments prematureToteDrops when conveyor dump is attempted prematurely", () => {
      const session = createMockSession()
      const penalized = recordPrematureToteDrop(session)
      expect(penalized.prematureToteDrops).toBe(1)
    })

    it("qualifies when all 4 Day 4 criteria are met", () => {
      const passed = evaluateDay4PassGate(
        0, // 0 premature drops
        4.8, // <= 7.0s resolution latency
        100, // 100% IC accuracy
        100 // 100% Hazmat compliance
      )
      expect(passed).toBe(true)
    })

    it("fails trainee if any premature tote drop occurred (Hard Blocker)", () => {
      const passed = evaluateDay4PassGate(1, 4.8, 100, 100)
      expect(passed).toBe(false)
    })

    it("fails trainee if resolution latency exceeds 7.0s", () => {
      const passed = evaluateDay4PassGate(0, 8.5, 100, 100)
      expect(passed).toBe(false)
    })
  })

  describe("Simulation Engine Hotkey Integration", () => {
    it("intercepts CTRL+K to initiate short pick workflow without conveyor dump", () => {
      const session = createMockSession()
      const { session: nextSession } = dispatch(session, {
        type: "KEY_PRESS",
        keys: "CTRL+K",
      })
      expect(nextSession.currentStep).toBe(WorkflowStep.EX_SHORT_PICK)
    })

    it("intercepts CTRL+M to initiate manual barcode entry", () => {
      const session = createMockSession()
      const { session: nextSession } = dispatch(session, {
        type: "KEY_PRESS",
        keys: "CTRL+M",
      })
      expect(nextSession.currentStep).toBe(WorkflowStep.EX_MANUAL_BARCODE)
    })

    it("blocks premature CTRL+A during active pick and logs violation", () => {
      const session = createMockSession()
      const { session: nextSession, result } = dispatch(session, {
        type: "KEY_PRESS",
        keys: "CTRL+A",
      })
      expect(result.success).toBe(false)
      expect(nextSession.prematureToteDrops).toBe(1)
    })
  })

  describe("Scorer Integration with Day 4 Telemetry", () => {
    it("computes prematureToteDrops, latency, IC accuracy, Hazmat compliance, and day4Passed", () => {
      const session: SimulationSession = {
        sessionId: "sess-d4-complete",
        userId: "user-001",
        scenarioId: day4Scenario.moduleId,
        moduleId: day4Scenario.moduleId,
        moduleType: day4Scenario.contentType,
        currentStep: WorkflowStep.PS_ROUND_COMPLETE,
        difficulty: day4Scenario.difficulty,
        currentPickIndex: 20,
        pickQueue: day4PickQueue,
        completedPicks: day4PickQueue.map((t, i) => ({
          pickTaskId: t.pickTaskId,
          item: t.item,
          quantityPicked: 1,
          scannedAt: new Date(1000000 + i * 8000),
        })),
        cart: day4Cart,
        toteStack: [],
        currentToteSlot: 1,
        scanEvents: day4PickQueue.map((t) => ({
          scanEventId: `scan-${t.pickTaskId}`,
          sessionId: "sess-d4-complete",
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: t.item.upcBarcode,
          scannedValue: t.item.upcBarcode,
          result: ScanResult.SUCCESS,
          timestamp: new Date(),
          responseTimeMs: 950,
        })),
        errors: [],
        startedAt: new Date(1000000),
        completedAt: new Date(1000000 + 20 * 8000),
        totalTimeMs: 160000,
        status: "COMPLETED",
        exceptionResolutionLatencies: [4200, 3800, 5100],
        prematureToteDrops: 0,
      }

      const score = calculateScore(session, day4Scenario)
      expect(score.prematureToteDrops).toBe(0)
      expect(score.exceptionResolutionLatencySeconds).toBe(4.37)
      expect(score.icDiscrepancyAccuracy).toBe(100)
      expect(score.hazmatComplianceScore).toBe(100)
      expect(score.day4Passed).toBe(true)

      const result = computeSessionResult(session, day4Scenario)
      expect(result.day4Passed).toBe(true)
      expect(result.prematureToteDrops).toBe(0)
    })
  })
})
