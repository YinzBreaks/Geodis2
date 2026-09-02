/**
 * reporting-service.test.ts
 *
 * Unit tests for Kinetic OS C-Suite Telemetry & Reporting Service.
 */

import { describe, it, expect } from "vitest"
import {
  getExecutiveSummary,
  getCohortRoster,
  generateAuditExport,
  calculateFunnelStages,
  BENCHMARK_COHORT,
} from "@/services/reporting-service"
import { ROI_CONSTANTS, CERTIFICATION_THRESHOLDS } from "@/services/certification-engine"

describe("Kinetic OS Telemetry & Reporting Service", () => {
  describe("Curriculum Funnel Progression Calculation", () => {
    it("computes conversion rates across Days 1 through 5 accurately", () => {
      const stages = calculateFunnelStages(BENCHMARK_COHORT)
      expect(stages).toHaveLength(5)

      // Day 1 to 5 checks
      expect(stages[0].day).toBe(1)
      expect(stages[0].label).toContain("Day 1")
      expect(stages[0].conversionRate).toBeGreaterThan(0)

      expect(stages[4].day).toBe(5)
      expect(stages[4].label).toContain("Day 5")

      const certifiedCount = BENCHMARK_COHORT.filter((a) => a.status === "CERTIFIED").length
      expect(stages[4].passedCount).toBe(certifiedCount)
    })

    it("returns empty array for empty cohort input", () => {
      expect(calculateFunnelStages([])).toEqual([])
    })
  })

  describe("Cohort Roster Filtering", () => {
    it("retrieves full cohort when filter is ALL", async () => {
      const roster = await getCohortRoster("ALL")
      expect(roster.length).toBe(BENCHMARK_COHORT.length)
    })

    it("filters only certified associates when filter is QUALIFIED", async () => {
      const qualified = await getCohortRoster("QUALIFIED")
      expect(qualified.length).toBeGreaterThan(0)
      expect(qualified.every((a) => a.status === "CERTIFIED")).toBe(true)
    })

    it("filters only in-training associates when filter is IN_TRAINING", async () => {
      const inTraining = await getCohortRoster("IN_TRAINING")
      expect(inTraining.length).toBeGreaterThan(0)
      expect(inTraining.every((a) => a.status === "IN_TRAINING")).toBe(true)
    })

    it("filters only remedial associates when filter is REMEDIAL", async () => {
      const remedial = await getCohortRoster("REMEDIAL")
      expect(remedial.every((a) => a.status === "REMEDIAL")).toBe(true)
    })
  })

  describe("Executive Summary & Labor Economics Modeling", () => {
    it("computes high-level cohort economics matching the 20-to-5 shift model", async () => {
      const summary = await getExecutiveSummary("FAC-BBWD-01")

      expect(summary.facilityId).toBe("FAC-BBWD-01")
      expect(summary.totalTrainees).toBe(BENCHMARK_COHORT.length)
      expect(summary.productiveHoursRecoupedPerHead).toBe(102.0)
      expect(summary.netDollarsSavedPerHead).toBe(4398.0)

      // Verified cohort totals
      const expectedTotalHours = summary.qualifiedCount * 102.0
      const expectedTotalSavings = summary.qualifiedCount * 4398.0
      expect(summary.totalHoursRecoupedCohort).toBe(expectedTotalHours)
      expect(summary.totalCohortFinancialBenefit).toBe(expectedTotalSavings)

      // Ramp duration compression check
      expect(summary.baselineShiftsToCompetence).toBe(20.0)
      expect(summary.avgShiftsToCompetence).toBeLessThan(20.0)
      expect(summary.shiftReductionPercentage).toBeGreaterThan(0)

      // Annualized projection check (120 hires = $527,760.00)
      expect(summary.annualizedFacilityProjection(120)).toBe(527760.0)
    })
  })

  describe("RFC-4180 Audit CSV Generation & Cryptographic Signatures", () => {
    it("generates valid RFC-4180 CSV with SHA-256 digests and complete headers", async () => {
      const csv = await generateAuditExport("FAC-BBWD-01")

      expect(typeof csv).toBe("string")
      const lines = csv.split("\r\n")
      expect(lines.length).toBeGreaterThan(BENCHMARK_COHORT.length)

      // Header verification
      const headerLine = lines[0]
      expect(headerLine).toContain("Candidate Name")
      expect(headerLine).toContain("Employee ID")
      expect(headerLine).toContain("Curriculum Day")
      expect(headerLine).toContain("Velocity (UPH)")
      expect(headerLine).toContain("First-Time Accuracy (%)")
      expect(headerLine).toContain("Status")
      expect(headerLine).toContain("Shifts to Competence")
      expect(headerLine).toContain("Productive Hours Recouped")
      expect(headerLine).toContain("Net Savings (USD)")
      expect(headerLine).toContain("Cryptographic SHA-256 Digest")

      // Check first data row contains a 64-char hex digest
      const firstDataRow = lines[1]
      expect(/[0-9a-f]{64}/.test(firstDataRow)).toBe(true)
    })
  })
})
