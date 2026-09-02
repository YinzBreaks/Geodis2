/**
 * cart-engine.ts — 9-Tote Cluster Cart State Engine
 *
 * Implements:
 * 1. 3-tier mobile batch cart layout (standard GEODIS 9-tote cart):
 *    - Tier 3 (Top Shelf): Slots 7, 8, 9
 *    - Tier 2 (Middle Shelf): Slots 4, 5, 6
 *    - Tier 1 (Bottom Shelf): Slots 1, 2, 3
 * 2. Put-to-Slot validation and mis-slotting prevention
 * 3. Tote Put Latency tracking (SLA <= 2.5s)
 * 4. Cart fill-status computation across all 9 slots
 * 5. Day 3 programmatic qualification gating
 */

import type {
  SimulationSession,
  ToteSlot,
  ScanResult,
} from "@/types/domain"

export type CartTier = 1 | 2 | 3

export interface CartSlotStatus {
  slot: ToteSlot
  tier: CartTier
  toteBarcode: string
  itemCount: number
  isTarget: boolean
}

export interface PutToSlotResult {
  isValid: boolean
  targetSlot: ToteSlot
  targetTier: CartTier
  scannedBarcode: string
  expectedBarcode: string
  error?: "MIS_SLOT_ATTEMPT" | "TOTE_NOT_FOUND"
  feedback?: string
}

/**
 * Return the shelf tier (1, 2, or 3) for a given cart tote slot.
 * - Tier 1: Bottom (Slots 1, 2, 3)
 * - Tier 2: Middle (Slots 4, 5, 6)
 * - Tier 3: Top (Slots 7, 8, 9)
 */
export function getSlotTier(slot: ToteSlot): CartTier {
  if (slot >= 7 && slot <= 9) return 3
  if (slot >= 4 && slot <= 6) return 2
  return 1
}

/**
 * Return all tote slots residing on the given cart tier.
 */
export function getTierSlots(tier: CartTier): ToteSlot[] {
  switch (tier) {
    case 3:
      return [7, 8, 9]
    case 2:
      return [4, 5, 6]
    case 1:
    default:
      return [1, 2, 3]
  }
}

/**
 * Return human-readable label for a cart tier.
 */
export function getTierName(tier: CartTier): string {
  switch (tier) {
    case 3:
      return "Tier 3 (Top Shelf - Shoulder Height)"
    case 2:
      return "Tier 2 (Middle Shelf - Ergonomic Golden Zone)"
    case 1:
    default:
      return "Tier 1 (Bottom Shelf - Lower Level)"
  }
}

/**
 * Validate a Beat 4 tote scan against the assigned pick task target slot.
 *
 * If the trainee scans an adjacent or different tote on the cart:
 * Returns MIS_SLOT_ATTEMPT with distinct tier and slot details.
 */
export function validatePutToSlot(
  session: SimulationSession,
  scannedBarcode: string
): PutToSlotResult {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const targetSlot = (currentPick?.targetSlot ?? 1) as ToteSlot
  const targetTier = getSlotTier(targetSlot)

  const targetTote = session.cart.totes.find((t) => t.slot === targetSlot)
  const expectedBarcode =
    targetTote?.barcode || `TOTE-${String(targetSlot).padStart(2, "0")}`

  const cleanedScanned = scannedBarcode.trim().toUpperCase()
  const cleanedExpected = expectedBarcode.trim().toUpperCase()

  if (cleanedScanned === cleanedExpected) {
    return {
      isValid: true,
      targetSlot,
      targetTier,
      scannedBarcode: cleanedScanned,
      expectedBarcode: cleanedExpected,
    }
  }

  // Check if user scanned another valid tote allocated on the cart (mis-slot attempt)
  const otherTote = session.cart.totes.find(
    (t) => t.barcode.trim().toUpperCase() === cleanedScanned
  )

  if (otherTote) {
    const scannedTier = getSlotTier(otherTote.slot)
    return {
      isValid: false,
      targetSlot,
      targetTier,
      scannedBarcode: cleanedScanned,
      expectedBarcode: cleanedExpected,
      error: "MIS_SLOT_ATTEMPT",
      feedback: `Mis-slot detected: Scanned Slot ${otherTote.slot} (${getTierName(scannedTier)}), but item belongs in Slot ${targetSlot} (${getTierName(targetTier)})`,
    }
  }

  return {
    isValid: false,
    targetSlot,
    targetTier,
    scannedBarcode: cleanedScanned,
    expectedBarcode: cleanedExpected,
    error: "TOTE_NOT_FOUND",
    feedback: `Invalid tote barcode "${cleanedScanned}". Expected target tote "${cleanedExpected}" in Slot ${targetSlot}`,
  }
}

/**
 * Compute real-time fill levels and target indicators across all 9 cart slots.
 */
export function computeCartSlotFillStatus(
  session: SimulationSession
): CartSlotStatus[] {
  const currentPick = session.pickQueue[session.currentPickIndex]
  const targetSlot = currentPick?.targetSlot

  return session.cart.totes.map((tote) => ({
    slot: tote.slot,
    tier: getSlotTier(tote.slot),
    toteBarcode: tote.barcode || `TOTE-${String(tote.slot).padStart(2, "0")}`,
    itemCount: tote.pickedItems.length,
    isTarget: tote.slot === targetSlot,
  }))
}

/**
 * Calculate Day 3 Tote Put Accuracy percentage (100% target, zero mis-slots).
 */
export function calculateTotePutAccuracy(
  validPicks: number,
  misSlotAttempts: number
): number {
  const total = validPicks + misSlotAttempts
  if (total <= 0) return 100
  return Number(((validPicks / total) * 100).toFixed(1))
}

/**
 * Calculate Mean Tote Put Latency in seconds (target <= 2.5s).
 */
export function calculateMeanTotePutLatency(latenciesMs: number[] = []): number {
  if (latenciesMs.length === 0) return 0.0
  const sum = latenciesMs.reduce((acc, v) => acc + v, 0)
  const meanSeconds = sum / latenciesMs.length / 1000
  return Number(meanSeconds.toFixed(2))
}

/**
 * Day 3 Programmatic Qualification Gate.
 *
 * Requirements:
 * - Tote Put Accuracy: 100% (zero mis-slot placements)
 * - Mean Tote Put Latency: <= 2.5 seconds
 * - Vertical Tier FTPA: >= 99.2%
 * - Sustained UPH: >= 120 UPH during active picking
 */
export function evaluateDay3PassGate(
  totePutAccuracy: number,
  meanLatencySeconds: number,
  verticalTierFtpa: number,
  sustainedUph: number
): boolean {
  const meetsToteAccuracy = totePutAccuracy === 100
  const meetsLatency = meanLatencySeconds <= 2.5
  const meetsFtpa = verticalTierFtpa >= 99.2
  const meetsUph = sustainedUph >= 120

  return meetsToteAccuracy && meetsLatency && meetsFtpa && meetsUph
}
