/**
 * day1-state-machine.test.ts
 *
 * Unit tests for DAY 1: Equipment Familiarity, Cart Prep, & The 4-Beat Check-Digit Protocol.
 *
 * Validates:
 * 1. The 4-Beat Cycle (Check Digit -> SKU -> Qty -> Tote)
 * 2. Sequence Bypass Guardrail (Attempting SKU scan before check digit)
 * 3. Single-piece pick Enter confirmation
 * 4. Phase C Reverse-Contrast barcode discrimination
 * 5. Scorer Day 1 Gating calculation
 */

import { describe, it, expect } from "vitest"
import {
  startSessionWithTasks,
  dispatch,
  calculateScore,
} from "@/engine/simulation-engine"
import { computeSessionResult } from "@/engine/scorer"
import { WorkflowStep, ScanResult } from "@/types/domain"
import {
  DAY1_EQUIPMENT_CHECK_DIGIT,
  day1Scenario,
  day1PickQueue,
  day1Cart,
  day1Totes,
} from "@/data/scenarios/day1EquipmentCheckDigit"

function makeDay1PickSession() {
  const session = startSessionWithTasks(
    "user-001",
    day1Scenario,
    day1PickQueue,
    day1Cart
  )
  return {
    ...session,
    cart: { ...day1Cart, isBuilt: true, totes: day1Totes },
    currentStep: WorkflowStep.PK_VERIFY_LOCATION,
  }
}

describe("DAY 1: 4-Beat Check-Digit Protocol State Machine", () => {
  it("executes the strict 4-beat picking cycle without intermediate confirmation modals", () => {
    let s = makeDay1PickSession()
    const firstPick = day1PickQueue[0]
    expect(firstPick.location.checkDigit).toBe("18")

    // ── BEAT 1: Location Check-Digit Verification ──────────────────────────
    // Trainee keys in or scans check digit "18"
    const beat1 = dispatch(s, { type: "TYPE", text: "18" })
    expect(beat1.result.success).toBe(true)
    expect(beat1.result.newStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)
    expect(beat1.session.checkDigitsVerified).toBe(1)
    s = beat1.session

    // ── BEAT 2: SKU / UPC Scan ─────────────────────────────────────────────
    const beat2 = dispatch(s, {
      type: "SCAN",
      value: firstPick.item.upcBarcode,
    })
    expect(beat2.result.success).toBe(true)
    expect(beat2.result.scanResult).toBe(ScanResult.SUCCESS)
    // Advances DIRECTLY to Beat 3 (PK_ENTER_QUANTITY) — no synthetic confirm steps!
    expect(beat2.result.newStep).toBe(WorkflowStep.PK_ENTER_QUANTITY)
    s = beat2.session

    // ── BEAT 3: Quantity Entry / Enter Confirmation ────────────────────────
    // For single-piece picks, entering "1" advances directly to Beat 4
    const beat3 = dispatch(s, { type: "TYPE", text: "1" })
    expect(beat3.result.success).toBe(true)
    expect(beat3.result.newStep).toBe(WorkflowStep.PK_SCAN_TOTE_BARCODE)
    s = beat3.session

    // ── BEAT 4: Target Cart Tote Scan ──────────────────────────────────────
    const beat4 = dispatch(s, { type: "SCAN", value: "TOTE-01" })
    expect(beat4.result.success).toBe(true)
    expect(beat4.result.scanResult).toBe(ScanResult.SUCCESS)
    // In 4-Beat mode, loops directly back to Beat 1 (PK_VERIFY_LOCATION) for the next pick!
    expect(beat4.result.newStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)
    expect(beat4.session.completedPicks).toHaveLength(1)
    expect(beat4.session.currentPickIndex).toBe(1)
  })

  it("intercepts out-of-order sequence bypass (premature SKU scan before check digit) without locking", () => {
    const session = startSessionWithTasks(
      "user-001",
      day1Scenario,
      day1PickQueue,
      day1Cart
    )
    let s = { ...session, currentStep: WorkflowStep.PK_VERIFY_LOCATION }
    const firstPick = day1PickQueue[0]

    // Trainee attempts to scan SKU UPC barcode directly without verifying check digit
    const bypassAttempt = dispatch(s, {
      type: "SCAN",
      value: firstPick.item.upcBarcode,
    })

    // Must be rejected with feedback
    expect(bypassAttempt.result.success).toBe(false)
    expect(bypassAttempt.result.feedback).toContain("Sequence bypass")
    // Trainee remains at Beat 1 (PK_VERIFY_LOCATION) to self-correct
    expect(bypassAttempt.session.currentStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)
    // Violation counter incremented
    expect(bypassAttempt.session.sequenceBypasses).toBe(1)

    // Now trainee inputs correct check digit and recovers cleanly
    const recovery = dispatch(bypassAttempt.session, { type: "TYPE", text: "18" })
    expect(recovery.result.success).toBe(true)
    expect(recovery.result.newStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)
  })

  it("allows single-piece pick confirmation via Enter key (CONFIRM action)", () => {
    const session = startSessionWithTasks(
      "user-001",
      day1Scenario,
      day1PickQueue,
      day1Cart
    )
    let s = { ...session, currentStep: WorkflowStep.PK_ENTER_QUANTITY }
    // Dispatch Enter confirmation with empty buffer
    const confirmResult = dispatch(s, {
      type: "CONFIRM",
      step: WorkflowStep.PK_ENTER_QUANTITY,
    })
    expect(confirmResult.result.success).toBe(true)
    expect(confirmResult.result.newStep).toBe(WorkflowStep.PK_SCAN_TOTE_BARCODE)
  })

  it("discriminates adjacent reverse-contrast products in Phase C", () => {
    const session = startSessionWithTasks(
      "user-001",
      day1Scenario,
      day1PickQueue,
      day1Cart
    )
    // Move to Pick 9 (Pick index 8: loc-316-01-B-02 Alpha-Pro)
    const pick9 = day1PickQueue[8]
    expect(pick9.location.displayLabel).toBe("316-01-B-02")
    expect(pick9.location.checkDigit).toBe("52")

    let s = {
      ...session,
      currentStep: WorkflowStep.PK_VERIFY_LOCATION,
      currentPickIndex: 8,
    }

    // Trainee inputs correct check digit 52
    s = dispatch(s, { type: "TYPE", text: "52" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)

    // Trainee attempts to scan distractor package from adjacent slot (Alpha-Lite instead of Alpha-Pro)
    const distractorItem = day1PickQueue[9].item
    const wrongItemScan = dispatch(s, {
      type: "SCAN",
      value: distractorItem.upcBarcode,
    })
    expect(wrongItemScan.result.success).toBe(false)
    expect(wrongItemScan.result.scanResult).toBe(ScanResult.WRONG_ITEM)

    // Trainee scans correct Alpha-Pro package
    const correctScan = dispatch(s, {
      type: "SCAN",
      value: pick9.item.upcBarcode,
    })
    expect(correctScan.result.success).toBe(true)
    expect(correctScan.result.newStep).toBe(WorkflowStep.PK_ENTER_QUANTITY)
  })

  it("calculates Day 1 telemetry and gating correctly in scorer", () => {
    const session = startSessionWithTasks(
      "user-001",
      day1Scenario,
      day1PickQueue,
      day1Cart
    )

    // Populate completed picks and verified check digits
    const qualifiedSession = {
      ...session,
      completedPicks: day1PickQueue.map((t) => ({
        pickTaskId: t.pickTaskId,
        item: t.item,
        quantityPicked: 1,
        scannedAt: new Date(),
      })),
      checkDigitsVerified: 10,
      sequenceBypasses: 0,
      totalCognitiveLatencyMs: 12000, // 1.2s average
      scanEvents: [
        ...day1PickQueue.map((t) => ({
          scanEventId: `scan-${t.pickTaskId}`,
          sessionId: session.sessionId,
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: t.item.upcBarcode,
          scannedValue: t.item.upcBarcode,
          result: ScanResult.SUCCESS,
          timestamp: new Date(),
          responseTimeMs: 1200,
        })),
      ],
    }

    const score = calculateScore(qualifiedSession, day1Scenario)
    expect(score.checkDigitScanRate).toBe(100)
    expect(score.firstTimePickAccuracy).toBe(100)
    expect(score.sequenceBypasses).toBe(0)
    expect(score.day1Passed).toBe(true)
    expect(score.cognitiveLatencyMs).toBe(1200)

    const result = computeSessionResult(qualifiedSession, day1Scenario)
    expect(result.day1Passed).toBe(true)
  })
})
