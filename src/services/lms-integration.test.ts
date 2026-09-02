/**
 * lms-integration.test.ts
 *
 * Unit tests for Automated LMS / HRIS Dispatch Service & Cryptographic Audit Digest.
 */

import { describe, it, expect } from "vitest"
import {
  generateAuditSignature,
  buildXApiStatement,
  buildScormPayload,
  dispatchLmsCertification,
  type CertificationPayload,
} from "@/services/lms-integration"

describe("Automated LMS & HRIS Integration Service", () => {
  const mockPayload: CertificationPayload = {
    candidateId: "user-elena",
    candidateName: "Elena Rostova",
    candidateEmail: "elena.rostova@geodis-logistics.internal",
    employeeId: "EMP-41095",
    facilityId: "FAC-BBWD-01",
    supervisorId: "sup-sarah-jenkins",
    sessionId: "sess-d5-final-elena",
    sustainedUph: 144.5,
    ftpa: 99.8,
    consecutiveQualifyingRuns: 2,
    shiftsToCompetence: 5.0,
    netSavingsUsd: 4398.0,
    completedAt: new Date("2026-09-02T17:15:00.000Z"),
  }

  describe("Cryptographic SHA-256 Audit Signature", () => {
    it("generates a 64-character hex SHA-256 hash", () => {
      const signature = generateAuditSignature(mockPayload)
      expect(signature).toHaveLength(64)
      expect(/^[0-9a-f]{64}$/.test(signature)).toBe(true)
    })

    it("is strictly deterministic for identical inputs", () => {
      const sig1 = generateAuditSignature(mockPayload)
      const sig2 = generateAuditSignature({ ...mockPayload })
      expect(sig1).toBe(sig2)
    })

    it("detects tampering with UPH or candidate metrics", () => {
      const originalSig = generateAuditSignature(mockPayload)
      const tamperedSig = generateAuditSignature({
        ...mockPayload,
        sustainedUph: 144.6, // Slight tampering
      })
      expect(originalSig).not.toBe(tamperedSig)
    })

    it("detects tampering with employee ID or facility ID", () => {
      const originalSig = generateAuditSignature(mockPayload)
      const tamperedSig = generateAuditSignature({
        ...mockPayload,
        employeeId: "EMP-99999",
      })
      expect(originalSig).not.toBe(tamperedSig)
    })
  })

  describe("xAPI (Tin Can) Statement Compliance", () => {
    it("formats standard compliant xAPI statement with verbs/passed", () => {
      const signature = generateAuditSignature(mockPayload)
      const statement = buildXApiStatement(mockPayload, signature)

      expect(statement.actor.mbox).toBe("mailto:elena.rostova@geodis-logistics.internal")
      expect(statement.actor.name).toBe("Elena Rostova")
      expect(statement.verb.id).toBe("http://adlnet.gov/expapi/verbs/passed")
      expect(statement.object.id).toBe("urn:geodis:warehousepro:floor-certified")

      // Results & scores
      expect(statement.result.success).toBe(true)
      expect(statement.result.completion).toBe(true)
      expect(statement.result.score.raw).toBe(144.5)
      expect(statement.result.score.scaled).toBe(0.998)

      // Audit extensions
      expect(statement.result.extensions["urn:geodis:audit:sha256"]).toBe(signature)
      expect(statement.result.extensions["urn:geodis:metrics:uph"]).toBe(144.5)
      expect(statement.result.extensions["urn:geodis:metrics:ftpa"]).toBe(99.8)
      expect(statement.result.extensions["urn:geodis:metrics:shifts_to_competence"]).toBe(5.0)
      expect(statement.result.extensions["urn:geodis:metrics:net_savings_usd"]).toBe(4398.0)
      expect(statement.result.extensions["urn:geodis:metrics:consecutive_runs"]).toBe(2)
    })
  })

  describe("SCORM 2004 4th Edition Payload", () => {
    it("formats cmi data model with pass status and audit digest", () => {
      const signature = generateAuditSignature(mockPayload)
      const scorm = buildScormPayload(mockPayload, signature)

      expect(scorm["cmi.completion_status"]).toBe("completed")
      expect(scorm["cmi.success_status"]).toBe("passed")
      expect(scorm["cmi.score.raw"]).toBe(144.5)
      expect(scorm["cmi.score.scaled"]).toBe(0.998)
      expect(scorm.auditDigest).toBe(signature)
      expect(scorm["cmi.suspend_data"]).toContain(signature)
    })
  })

  describe("LMS Dispatch Execution", () => {
    it("executes dispatch and produces verifiable audit result", async () => {
      const result = await dispatchLmsCertification(mockPayload)

      expect(result.success).toBe(true)
      expect(result.auditSignature).toBeDefined()
      expect(result.xApiStatement).toBeDefined()
      expect(result.scormPayload).toBeDefined()
      expect(result.dispatchedAt).toBeInstanceOf(Date)
    })
  })
})
