/**
 * exception-engine.ts — Non-Destructive Exception Engine
 *
 * Implements:
 * 1. Non-destructive exception state transitions:
 *    - EX_SHORT_PICK & EX_SHORT_REASON: Logs physical short inventory delta,
 *      puts available items into active tote, retains active tote on cart,
 *      and advances to next pick in the wave.
 *    - EX_MANUAL_BARCODE & EX_MANUAL_CHECK_DIGIT: Two-step override for degraded barcodes.
 *    - EX_DAMAGE_TAG: QA quarantine logging and bad-order bin assignment.
 *    - EX_HAZMAT_ALERT & EX_HAZMAT_REDIRECT: Safety stop and segregation to TOTE-09-HAZ.
 * 2. Active tote retention: Active totes MUST NOT be railed to the conveyor on defects.
 * 3. Exception resolution latency tracking (SLA <= 7.0s).
 * 4. Day 4 qualification gating evaluation.
 */

import {
  WorkflowStep,
  type SimulationSession,
  type PickTask,
} from "@/types/domain"

export type ShortReason = 1 | 2 | 3

export const SHORT_REASON_LABELS: Record<ShortReason, string> = {
  1: "Empty Bin Slot (0 Available)",
  2: "Partial Inventory (Fewer than Requested)",
  3: "Suspected Mis-slot (Wrong SKU in Bin)",
}

/**
 * Initiate Short Pick exception flow (triggered by CTRL+K during pick).
 */
export function initiateShortPick(session: SimulationSession): SimulationSession {
  return {
    ...session,
    currentStep: WorkflowStep.EX_SHORT_PICK,
    exceptionStartTimestamp: Date.now(),
    activeExceptionBuffer: {
      type: "SHORT",
    },
  }
}

/**
 * Process entered available quantity at EX_SHORT_PICK.
 * If found < requested: routes to EX_SHORT_REASON.
 * If found === requested: resumes normal pick flow.
 */
export function processShortPickQty(
  session: SimulationSession,
  foundQtyStr: string
): { session: SimulationSession; nextStep: WorkflowStep; error?: string } {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const reqQty = currentPick?.quantityRequired ?? 1
  const found = parseInt(foundQtyStr.trim(), 10)

  if (isNaN(found) || found < 0 || found > reqQty) {
    return {
      session,
      nextStep: WorkflowStep.EX_SHORT_PICK,
      error: `Invalid quantity. Enter 0 to ${reqQty}.`,
    }
  }

  const updatedBuffer = {
    ...session.activeExceptionBuffer,
    type: "SHORT" as const,
    foundQty: found,
  }

  if (found < reqQty) {
    // Partial or zero shortage -> ask for short reason
    return {
      session: {
        ...session,
        currentStep: WorkflowStep.EX_SHORT_REASON,
        activeExceptionBuffer: updatedBuffer,
      },
      nextStep: WorkflowStep.EX_SHORT_REASON,
    }
  }

  // Found full quantity -> continue to Beat 3 quantity confirmation
  return {
    session: {
      ...session,
      currentStep: WorkflowStep.PK_ENTER_QUANTITY,
      activeExceptionBuffer: undefined,
    },
    nextStep: WorkflowStep.PK_ENTER_QUANTITY,
  }
}

/**
 * Process entered short reason code at EX_SHORT_REASON (1, 2, or 3).
 * Logs IC discrepancy delta, puts found units into active tote,
 * keeps tote in cart slot, and advances to the next pick in the wave.
 */
export function processShortReason(
  session: SimulationSession,
  reasonStr: string
): { session: SimulationSession; nextStep: WorkflowStep; error?: string } {
  const code = parseInt(reasonStr.trim(), 10) as ShortReason
  if (code !== 1 && code !== 2 && code !== 3) {
    return {
      session,
      nextStep: WorkflowStep.EX_SHORT_REASON,
      error: "Invalid reason. Select [1: Empty, 2: Partial, 3: Mis-slot].",
    }
  }

  const currentPick = session.pickQueue[session.currentPickIndex]
  const reqQty = currentPick?.quantityRequired ?? 1
  const foundQty = session.activeExceptionBuffer?.foundQty ?? 0
  const delta = reqQty - foundQty

  // Log IC audit delta
  const discrepancy = {
    pickTaskId: currentPick?.pickTaskId ?? `pick-${session.currentPickIndex}`,
    sku: currentPick?.item.sku ?? "",
    locationId: currentPick?.location.locationId ?? "",
    requestedQty: reqQty,
    actualFoundQty: foundQty,
    delta,
    reason: code,
    timestamp: new Date(),
  }

  // Measure exception latency
  const latencyMs = session.exceptionStartTimestamp
    ? Date.now() - session.exceptionStartTimestamp
    : 3000

  // Put found items into the active tote (if found > 0)
  let updatedCart = session.cart
  if (foundQty > 0 && currentPick) {
    updatedCart = {
      ...session.cart,
      totes: session.cart.totes.map((t) =>
        t.slot === currentPick.targetSlot
          ? {
              ...t,
              pickedItems: [
                ...t.pickedItems,
                {
                  pickTaskId: currentPick.pickTaskId,
                  item: currentPick.item,
                  quantityPicked: foundQty,
                  scannedAt: new Date(),
                },
              ],
            }
          : t
      ),
    }
  }

  // Advance to the NEXT pick in the wave (do NOT dump tote to conveyor)
  const nextPickIndex = session.currentPickIndex + 1
  const isWaveComplete = nextPickIndex >= session.pickQueue.length
  const nextStep = isWaveComplete
    ? WorkflowStep.PS_ROUND_COMPLETE
    : WorkflowStep.PK_VERIFY_LOCATION

  const updatedSession: SimulationSession = {
    ...session,
    cart: updatedCart,
    currentStep: nextStep,
    currentPickIndex: nextPickIndex,
    inventoryDiscrepancies: [
      ...(session.inventoryDiscrepancies ?? []),
      discrepancy,
    ],
    exceptionResolutionLatencies: [
      ...(session.exceptionResolutionLatencies ?? []),
      latencyMs,
    ],
    activeExceptionBuffer: undefined,
    exceptionStartTimestamp: undefined,
    stepPromptTimestamp: Date.now(),
  }

  return {
    session: updatedSession,
    nextStep,
  }
}

/**
 * Initiate Manual Barcode Entry flow (triggered by CTRL+M when barcode is degraded).
 */
export function initiateManualBarcode(
  session: SimulationSession
): SimulationSession {
  return {
    ...session,
    currentStep: WorkflowStep.EX_MANUAL_BARCODE,
    exceptionStartTimestamp: Date.now(),
    activeExceptionBuffer: {
      type: "MANUAL",
    },
  }
}

/**
 * Process manual 12-digit UPC entry at EX_MANUAL_BARCODE.
 */
export function processManualBarcode(
  session: SimulationSession,
  upcStr: string
): { session: SimulationSession; nextStep: WorkflowStep; error?: string } {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const cleaned = upcStr.trim().toUpperCase()

  if (!currentPick) {
    return {
      session,
      nextStep: WorkflowStep.EX_MANUAL_BARCODE,
      error: "No active pick task found.",
    }
  }

  // Verify UPC match
  if (
    cleaned !== currentPick.item.upcBarcode.toUpperCase() &&
    cleaned !== currentPick.item.sku.toUpperCase()
  ) {
    return {
      session,
      nextStep: WorkflowStep.EX_MANUAL_BARCODE,
      error: "UPC mismatch: Check packaging label and re-enter.",
    }
  }

  // Advance to Step 2 of manual override: Confirm Shelf Check Digit
  return {
    session: {
      ...session,
      currentStep: WorkflowStep.EX_MANUAL_CHECK_DIGIT,
      activeExceptionBuffer: {
        ...session.activeExceptionBuffer,
        type: "MANUAL",
        enteredUpc: cleaned,
      },
    },
    nextStep: WorkflowStep.EX_MANUAL_CHECK_DIGIT,
  }
}

/**
 * Process manual shelf check-digit confirmation at EX_MANUAL_CHECK_DIGIT.
 */
export function processManualCheckDigit(
  session: SimulationSession,
  cdStr: string
): { session: SimulationSession; nextStep: WorkflowStep; error?: string } {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const cleanedCd = cdStr.trim().toUpperCase()

  if (
    !currentPick ||
    !currentPick.location.checkDigit ||
    cleanedCd !== currentPick.location.checkDigit.toUpperCase()
  ) {
    return {
      session,
      nextStep: WorkflowStep.EX_MANUAL_CHECK_DIGIT,
      error: "Check-digit mismatch: Confirm physical shelf tag.",
    }
  }

  const latencyMs = session.exceptionStartTimestamp
    ? Date.now() - session.exceptionStartTimestamp
    : 4000

  return {
    session: {
      ...session,
      currentStep: WorkflowStep.PK_ENTER_QUANTITY,
      exceptionResolutionLatencies: [
        ...(session.exceptionResolutionLatencies ?? []),
        latencyMs,
      ],
      activeExceptionBuffer: undefined,
      exceptionStartTimestamp: undefined,
      stepPromptTimestamp: Date.now(),
    },
    nextStep: WorkflowStep.PK_ENTER_QUANTITY,
  }
}

/**
 * Initiate Damaged Goods Tag flow (triggered by CTRL+D).
 */
export function initiateDamageTag(
  session: SimulationSession
): SimulationSession {
  return {
    ...session,
    currentStep: WorkflowStep.EX_DAMAGE_TAG,
    exceptionStartTimestamp: Date.now(),
    activeExceptionBuffer: {
      type: "DAMAGE",
    },
  }
}

/**
 * Confirm Damage Tag: Quarantine item to bad-order bin, keep active tote,
 * schedule IC replacement, and advance to next pick.
 */
export function confirmDamageTag(
  session: SimulationSession
): { session: SimulationSession; nextStep: WorkflowStep } {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const latencyMs = session.exceptionStartTimestamp
    ? Date.now() - session.exceptionStartTimestamp
    : 3500

  const damageRecord = {
    pickTaskId: currentPick?.pickTaskId ?? `pick-${session.currentPickIndex}`,
    sku: currentPick?.item.sku ?? "",
    locationId: currentPick?.location.locationId ?? "",
    disposition: "BAD_ORDER_BIN" as const,
    scheduledIcReplacement: true,
    timestamp: new Date(),
  }

  const nextPickIndex = session.currentPickIndex + 1
  const isWaveComplete = nextPickIndex >= session.pickQueue.length
  const nextStep = isWaveComplete
    ? WorkflowStep.PS_ROUND_COMPLETE
    : WorkflowStep.PK_VERIFY_LOCATION

  return {
    session: {
      ...session,
      currentStep: nextStep,
      currentPickIndex: nextPickIndex,
      damageQuarantineRecords: [
        ...(session.damageQuarantineRecords ?? []),
        damageRecord,
      ],
      exceptionResolutionLatencies: [
        ...(session.exceptionResolutionLatencies ?? []),
        latencyMs,
      ],
      activeExceptionBuffer: undefined,
      exceptionStartTimestamp: undefined,
      stepPromptTimestamp: Date.now(),
    },
    nextStep,
  }
}

/**
 * Initiate Hazmat Incident Alert (triggered by CTRL+H).
 */
export function initiateHazmatAlert(
  session: SimulationSession
): SimulationSession {
  return {
    ...session,
    currentStep: WorkflowStep.EX_HAZMAT_ALERT,
    exceptionStartTimestamp: Date.now(),
    activeExceptionBuffer: {
      type: "HAZMAT",
    },
  }
}

/**
 * Confirm Hazmat Alert supervisor notification, advance to Hazmat Redirection.
 */
export function confirmHazmatAlert(
  session: SimulationSession
): { session: SimulationSession; nextStep: WorkflowStep } {
  return {
    session: {
      ...session,
      currentStep: WorkflowStep.EX_HAZMAT_REDIRECT,
    },
    nextStep: WorkflowStep.EX_HAZMAT_REDIRECT,
  }
}

/**
 * Process Hazmat redirection: requires scanning TOTE-09 (or TOTE-09-HAZ).
 */
export function processHazmatRedirect(
  session: SimulationSession,
  toteBarcode: string
): { session: SimulationSession; nextStep: WorkflowStep; error?: string } {
  const cleaned = toteBarcode.trim().toUpperCase()
  if (cleaned !== "TOTE-09" && cleaned !== "TOTE-09-HAZ") {
    return {
      session,
      nextStep: WorkflowStep.EX_HAZMAT_REDIRECT,
      error: "Hazmat protocol violation: Must scan dedicated containment TOTE-09-HAZ.",
    }
  }

  const currentPick = session.pickQueue[session.currentPickIndex]
  const latencyMs = session.exceptionStartTimestamp
    ? Date.now() - session.exceptionStartTimestamp
    : 5000

  const hazmatRecord = {
    pickTaskId: currentPick?.pickTaskId ?? `pick-${session.currentPickIndex}`,
    sku: currentPick?.item.sku ?? "",
    locationId: currentPick?.location.locationId ?? "",
    incidentType: "PUNCTURED_AEROSOL" as const,
    supervisorNotified: true,
    destinationTote: "TOTE-09-HAZ",
    timestamp: new Date(),
  }

  const nextPickIndex = session.currentPickIndex + 1
  const isWaveComplete = nextPickIndex >= session.pickQueue.length
  const nextStep = isWaveComplete
    ? WorkflowStep.PS_ROUND_COMPLETE
    : WorkflowStep.PK_VERIFY_LOCATION

  return {
    session: {
      ...session,
      currentStep: nextStep,
      currentPickIndex: nextPickIndex,
      hazmatIncidentRecords: [
        ...(session.hazmatIncidentRecords ?? []),
        hazmatRecord,
      ],
      exceptionResolutionLatencies: [
        ...(session.exceptionResolutionLatencies ?? []),
        latencyMs,
      ],
      activeExceptionBuffer: undefined,
      exceptionStartTimestamp: undefined,
      stepPromptTimestamp: Date.now(),
    },
    nextStep,
  }
}

/**
 * Log a premature tote drop / conveyor dump attempt (Hard Blocker).
 */
export function recordPrematureToteDrop(
  session: SimulationSession
): SimulationSession {
  return {
    ...session,
    prematureToteDrops: (session.prematureToteDrops ?? 0) + 1,
  }
}

/**
 * Compute Mean Exception Resolution Latency in seconds (SLA <= 7.0s).
 */
export function calculateMeanExceptionLatency(
  latenciesMs: number[] = []
): number {
  if (latenciesMs.length === 0) return 0.0
  const sum = latenciesMs.reduce((acc, v) => acc + v, 0)
  return Number((sum / latenciesMs.length / 1000).toFixed(2))
}

/**
 * Day 4 Programmatic Qualification Gate.
 *
 * Requirements:
 * - Premature Tote Drops: 0 (Hard Blocker)
 * - Mean Exception Resolution Latency: <= 7.0 seconds
 * - IC Discrepancy Accuracy: 100%
 * - Hazmat Compliance: 100%
 */
export function evaluateDay4PassGate(
  prematureDrops: number,
  meanLatencySeconds: number,
  icAccuracy: number,
  hazmatCompliance: number
): boolean {
  const meetsDrops = prematureDrops === 0
  const meetsLatency = meanLatencySeconds <= 7.0
  const meetsIc = icAccuracy >= 100
  const meetsHazmat = hazmatCompliance >= 100

  return meetsDrops && meetsLatency && meetsIc && meetsHazmat
}
