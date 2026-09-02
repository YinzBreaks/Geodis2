/**
 * certification-engine.test.ts
 *
 * Unit tests for Day 5 Floor Certification & ROI Calculation Engine.
 */

import { describe, it, expect } from "vitest"
import {
  evaluateFloorCertification,
  calculateSustainedUph,
  CERTIFICATION_THRESHOLDS,
  ROI_CONSTANTS,
  type CertificationEvaluationInput,
} from "@/services/certification-engine"
import {
  WorkflowStep,
  ScanResult,
  type SimulationSession,
  type SessionScore,
} from "@/types/domain"
import {
  day5Scenario,
  day5PickQueue,
  day5Cart,
} from "@/data/scenarios/day5CertificationWave"

describe("Deterministic Floor Certification Engine", () => {
  function createMockSession(): SimulationSession {
    return {
      sessionId: "sess-d5-cert-001",
      userId: "user-marcus",
      scenarioId: day5Scenario.moduleId,
      moduleId: day5Scenario.moduleId,
      currentStep: WorkflowStep.PS_ROUND_COMPLETE,
      difficulty: day5Scenario.difficulty,
      currentPickIndex: 50,
      pickQueue: day5PickQueue,
      completedPicks: day5PickQueue.map((p, idx) => ({
        pickTaskId: p.pickTaskId,
        item: p.item,
        quantityPicked: 1,
        scannedAt: new Date(1000000 + idx * 24000),
      })),
      cart: day5Cart,
      toteStack: [],
      currentToteSlot: 1,
      scanEvents: [],
      errors: [],
      startedAt: new Date(1000000),
      completedAt: new Date(1000000 + 50 * 24000), // 1200 seconds = 20 mins
      totalTimeMs: 1200000,
      status: "COMPLETED",
      prematureToteDrops: 0,
    }
  }

  function createMockScore(overrides?: Partial<SessionScore>): SessionScore {
    return {
      sessionId: "sess-d5-cert-001",
      totalPicks: 50,
      correctFirstScanRate: 100,
      errorCount: 0,
      correctedErrorCount: 0,
      averageResponseTimeMs: 950,
      accuracyScore: 100,
      speedScore: 98,
      finalScore: 99.2,
      passed: true,
      passingThreshold: 98,
      checkDigitScanRate: 100,
      firstTimePickAccuracy: 100.0,
      cognitiveLatencyMs: 420,
      sequenceBypasses: 0,
      day1Passed: true,
      pathEfficiency: 98.4,
      backtrackViolations: 0,
      cadenceVariance: 0.12,
      day2Passed: true,
      totePutAccuracy: 100,
      meanTotePutLatencySeconds: 1.85,
      verticalTierFtpa: 100,
      sustainedUph: 150.0,
      day3Passed: true,
      prematureToteDrops: 0,
      exceptionResolutionLatencySeconds: 4.2,
      icDiscrepancyAccuracy: 100,
      hazmatComplianceScore: 100,
      day4Passed: true,
      ...overrides,
    }
  }

  describe("Sustained Active UPH Calculation", () => {
    it("computes net picks per hour accurately", () => {
      // 50 picks in 20 minutes (1,200,000 ms) = 50 / (1/3 hr) = 150 UPH
      const uph = calculateSustainedUph(50, 1200000)
      expect(uph).toBe(150.0)
    })

    it("returns 0 on zero picks or invalid duration", () => {
      expect(calculateSustainedUph(0, 1000)).toBe(0)
      expect(calculateSustainedUph(50, 0)).toBe(0)
    })
  })

  describe("Production SLA Evaluation & Criteria Checks", () => {
    it("qualifies a single run when all 6 production criteria are met", () => {
      const session = createMockSession()
      const score = createMockScore()

      const input: CertificationEvaluationInput = {
        userId: "user-marcus",
        employeeId: "EMP-41092",
        candidateName: "Marcus Vance",
        facilityId: "BBWD-01",
        sessionId: session.sessionId,
        session,
        score,
        consecutiveQualifyingRuns: 0,
      }

      const result = evaluateFloorCertification(input)
      expect(result.runPassed).toBe(true)
      expect(result.criteriaBreakdown.sustainedUph.passed).toBe(true)
      expect(result.criteriaBreakdown.ftpa.passed).toBe(true)
      expect(result.criteriaBreakdown.pathEfficiency.passed).toBe(true)
      expect(result.criteriaBreakdown.bayBacktracks.passed).toBe(true)
      expect(result.criteriaBreakdown.meanTotePutLatencySeconds.passed).toBe(true)
      expect(result.criteriaBreakdown.prematureToteDrops.passed).toBe(true)
      expect(result.criteriaBreakdown.unresolvedExceptions.passed).toBe(true)

      // Only 1 qualifying run so far -> not yet competent
      expect(result.consecutiveQualifyingRuns).toBe(1)
      expect(result.isCompetent).toBe(false)
      expect(result.certified).toBe(false)
    })

    it("fails run if sustained UPH is below 140.0 threshold", () => {
      const session = createMockSession()
      const score = createMockScore({ sustainedUph: 135.5 })

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
      })

      expect(result.runPassed).toBe(false)
      expect(result.criteriaBreakdown.sustainedUph.passed).toBe(false)
      expect(result.isCompetent).toBe(false)
    })

    it("fails run if FTPA is below 99.5% threshold", () => {
      const session = createMockSession()
      const score = createMockScore({ firstTimePickAccuracy: 98.0 })

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
      })

      expect(result.runPassed).toBe(false)
      expect(result.criteriaBreakdown.ftpa.passed).toBe(false)
    })

    it("fails run if premature conveyor drop occurred (Hard Blocker)", () => {
      const session = createMockSession()
      session.prematureToteDrops = 1
      const score = createMockScore({ sustainedUph: 165.0, firstTimePickAccuracy: 100.0 })

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
      })

      expect(result.runPassed).toBe(false)
      expect(result.criteriaBreakdown.prematureToteDrops.passed).toBe(false)
      expect(result.isCompetent).toBe(false)
    })

    it("fails run if bay backtracks occur or path efficiency is below 95%", () => {
      const session = createMockSession()
      const score = createMockScore({ backtrackViolations: 1, pathEfficiency: 92.0 })

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
      })

      expect(result.runPassed).toBe(false)
      expect(result.criteriaBreakdown.bayBacktracks.passed).toBe(false)
      expect(result.criteriaBreakdown.pathEfficiency.passed).toBe(false)
    })

    it("fails run if put latency exceeds 2.2s", () => {
      const session = createMockSession()
      const score = createMockScore({ meanTotePutLatencySeconds: 2.5 })

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
      })

      expect(result.runPassed).toBe(false)
      expect(result.criteriaBreakdown.meanTotePutLatencySeconds.passed).toBe(false)
    })
  })

  describe("2-Consecutive-Run Gate & Competency State", () => {
    it("flips isCompetent = true and certified = true on second consecutive pass", () => {
      const session = createMockSession()
      const score = createMockScore()

      const input: CertificationEvaluationInput = {
        userId: "user-marcus",
        employeeId: "EMP-41092",
        candidateName: "Marcus Vance",
        facilityId: "BBWD-01",
        sessionId: session.sessionId,
        session,
        score,
        consecutiveQualifyingRuns: 1, // Previously passed run 1
      }

      const result = evaluateFloorCertification(input)
      expect(result.runPassed).toBe(true)
      expect(result.consecutiveQualifyingRuns).toBe(2)
      expect(result.isCompetent).toBe(true)
      expect(result.certified).toBe(true)
      expect(result.shiftsToCompetence).toBe(5.0)
      expect(result.shiftReductionPercentage).toBe(75)
    })

    it("resets consecutiveQualifyingRuns to 0 on any failed run", () => {
      const session = createMockSession()
      const score = createMockScore({ sustainedUph: 125.0 }) // Failed run

      const input: CertificationEvaluationInput = {
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
        consecutiveQualifyingRuns: 1,
      }

      const result = evaluateFloorCertification(input)
      expect(result.runPassed).toBe(false)
      expect(result.consecutiveQualifyingRuns).toBe(0)
      expect(result.isCompetent).toBe(false)
      expect(result.certified).toBe(false)
      expect(result.shiftsToCompetence).toBe(20.0)
    })
  })

  describe("C-Suite ROI & Labor Recoupment Economics", () => {
    it("computes exact labor recoupment breakdown ($4,398 net per head)", () => {
      const session = createMockSession()
      const score = createMockScore()

      const result = evaluateFloorCertification({
        userId: "user-marcus",
        sessionId: session.sessionId,
        session,
        score,
        consecutiveQualifyingRuns: 1,
      })

      expect(result.roiMetrics.trainerShadowSavings).toBe(1800.0) // 120hrs * $15
      expect(result.roiMetrics.wageRecoupmentSavings).toBe(1440.0) // 80hrs * $18
      expect(result.roiMetrics.mispickDefectSavings).toBe(528.0) // 24 * $22
      expect(result.roiMetrics.churnStabilizationSavings).toBe(630.0)
      expect(result.roiMetrics.netFinancialSavings).toBe(4398.0)
      expect(result.roiMetrics.hoursRecouped).toBe(102.0)

      // Annualized projection check (120 hires = $527,760)
      expect(result.roiMetrics.annualizedFacilityProjection(120)).toBe(527760.0)
    })
  })
})
