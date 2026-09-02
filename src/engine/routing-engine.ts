/**
 * routing-engine.ts — Serpentine Routing & Spatial Traversal Validation Engine
 *
 * Implements:
 * 1. Physical Aisle Metric Model for Aisle 316 (corridor cross width w_aisle = 3.0m)
 * 2. Strict monotonic bay progression & backtracking detection
 * 3. Path efficiency calculation (Optimal distance / Actual distance)
 * 4. Pick cadence Coefficient of Variation (CV = sigma / mu)
 * 5. Day 2 programmatic qualification gating
 *
 * Per GEODIS standard: Aisle 316 has Left and Right racking faces. Trainees
 * traverse in an S-curve (Bay 01 -> Bay 02 -> Bay 03 -> Bay 04), picking Level A
 * before Level B within each bay to eliminate yo-yo backtracking.
 */

import type { WarehouseLocation } from "@/types/domain"
import type {
  SpatialCoordinates,
  SpatialLocation,
  BacktrackEvent,
  PathEfficiencyReport,
} from "@/types/routing"

/** Standard physical cross-corridor width in meters for Aisle 316 */
export const AISLE_CROSS_WIDTH_METERS = 3.0

/**
 * Parse bay string to integer (e.g. "01" -> 1, "04" -> 4).
 */
export function getBayNumber(location: WarehouseLocation): number {
  const parsed = parseInt(location.bay, 10)
  return isNaN(parsed) ? 1 : parsed
}

/**
 * Map shelf level to vertical tier index (Level A = 0 bottom, Level B = 1 golden zone).
 */
export function getLevelIndex(location: WarehouseLocation): number {
  const levelUpper = location.level.trim().toUpperCase()
  switch (levelUpper) {
    case "A":
      return 0
    case "B":
      return 1
    case "C":
      return 2
    case "D":
      return 3
    default:
      return 0
  }
}

/**
 * Calculate physical walking distance between two spatial coordinates in Aisle 316.
 *
 * Accounts for physical racking barriers:
 * - Same side (Left -> Left or Right -> Right): delta_y
 * - Cross-aisle (Left -> Right or Right -> Left): delta_y + w_aisle_width
 */
export function calculatePointDistance(
  p1: SpatialCoordinates,
  p2: SpatialCoordinates,
  aisleWidth = AISLE_CROSS_WIDTH_METERS
): number {
  const deltaY = Math.abs(p2.y - p1.y)
  const isAisleCross = p1.aisleSide !== p2.aisleSide

  return isAisleCross ? deltaY + aisleWidth : deltaY
}

/**
 * Calculate the cumulative physical distance traversed through a sequence of coordinates.
 */
export function calculatePathDistance(
  coords: SpatialCoordinates[],
  aisleWidth = AISLE_CROSS_WIDTH_METERS
): number {
  if (coords.length < 2) return 0

  let total = 0
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculatePointDistance(coords[i], coords[i + 1], aisleWidth)
  }

  return Number(total.toFixed(2))
}

/**
 * Detect whether moving from `fromLoc` to `toLoc` constitutes a backtracking event.
 *
 * Rules:
 * 1. Bay Regression: toBay < maxBayReached (jumping back to an earlier bay)
 * 2. Level Regression: same bay, but moving from higher tier (B) back down to lower tier (A)
 */
export function detectBacktrack(
  fromLoc: WarehouseLocation,
  toLoc: WarehouseLocation,
  maxBayReached: number
): BacktrackEvent | null {
  const fromBay = getBayNumber(fromLoc)
  const toBay = getBayNumber(toLoc)
  const fromLevel = getLevelIndex(fromLoc)
  const toLevel = getLevelIndex(toLoc)

  const p1 = (fromLoc as SpatialLocation).spatial ?? {
    x: 20,
    y: fromBay * 20,
    aisleSide: "LEFT",
  }
  const p2 = (toLoc as SpatialLocation).spatial ?? {
    x: 20,
    y: toBay * 20,
    aisleSide: "LEFT",
  }
  const dist = calculatePointDistance(p1, p2)

  // 1. Bay Regression: visited bay is lower than highest bay reached
  if (toBay < maxBayReached) {
    return {
      eventId: `bt-bay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromLocationId: fromLoc.locationId,
      fromDisplayLabel: fromLoc.displayLabel,
      fromBay,
      toLocationId: toLoc.locationId,
      toDisplayLabel: toLoc.displayLabel,
      toBay,
      distanceTraveled: dist,
      timestamp: new Date(),
      reason: "BAY_REGRESSION",
    }
  }

  // 2. Level Regression: within same bay, moving from Level B down to Level A
  if (toBay === fromBay && toLevel < fromLevel) {
    return {
      eventId: `bt-lvl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fromLocationId: fromLoc.locationId,
      fromDisplayLabel: fromLoc.displayLabel,
      fromBay,
      toLocationId: toLoc.locationId,
      toDisplayLabel: toLoc.displayLabel,
      toBay,
      distanceTraveled: dist,
      timestamp: new Date(),
      reason: "LEVEL_REGRESSION",
    }
  }

  return null
}

/**
 * Calculate path efficiency ratio: (optimalDistance / actualDistance) * 100.
 *
 * Capped at 100%. Returns 100 if actualDistance <= optimalDistance.
 */
export function calculatePathEfficiency(
  actualDistance: number,
  optimalDistance: number
): number {
  if (optimalDistance <= 0 || actualDistance <= 0) return 100
  const effectiveActual = Math.max(actualDistance, optimalDistance)
  return Math.min(100, Math.round((optimalDistance / effectiveActual) * 100))
}

/**
 * Calculate Cadence Coefficient of Variation (CV = sigma / mu) across pick intervals.
 *
 * Safeguards per user review:
 * - Return 0.0 if fewer than 3 timestamps exist.
 * - Exclude initial idle/pause before the first scan so opening instructions
 *   do not artificially spike variance.
 */
export function calculateCadenceCv(scanTimestamps: (Date | number)[]): number {
  if (scanTimestamps.length < 3) return 0.0

  // Calculate pick-to-pick intervals (in seconds) between consecutive completed pick scans
  const intervals: number[] = []
  for (let i = 0; i < scanTimestamps.length - 1; i++) {
    const t1 =
      typeof scanTimestamps[i] === "number"
        ? (scanTimestamps[i] as number)
        : (scanTimestamps[i] as Date).getTime()
    const t2 =
      typeof scanTimestamps[i + 1] === "number"
        ? (scanTimestamps[i + 1] as number)
        : (scanTimestamps[i + 1] as Date).getTime()
    const diffSeconds = Math.max(0.1, (t2 - t1) / 1000)
    intervals.push(diffSeconds)
  }

  if (intervals.length < 2) return 0.0

  // Mean interval
  const sum = intervals.reduce((acc, v) => acc + v, 0)
  const mean = sum / intervals.length
  if (mean <= 0) return 0.0

  // Standard deviation
  const variance =
    intervals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
    intervals.length
  const stdDev = Math.sqrt(variance)

  // Coefficient of Variation
  const cv = stdDev / mean
  return Number(cv.toFixed(2))
}

/**
 * Comprehensive Day 2 Traversal Telemetry Evaluation.
 */
export function evaluateTraversal(
  actualLocations: WarehouseLocation[],
  optimalLocations: WarehouseLocation[],
  pickTimestamps: (Date | number)[] = []
): PathEfficiencyReport {
  const actualCoords = actualLocations
    .map((l) => (l as SpatialLocation).spatial)
    .filter((c): c is SpatialCoordinates => Boolean(c))

  const optimalCoords = optimalLocations
    .map((l) => (l as SpatialLocation).spatial)
    .filter((c): c is SpatialCoordinates => Boolean(c))

  const actualDistance = calculatePathDistance(actualCoords)
  const optimalDistance = calculatePathDistance(optimalCoords)
  const efficiencyScore = calculatePathEfficiency(actualDistance, optimalDistance)

  // Scan through actual path to record all backtracking events
  const backtracks: BacktrackEvent[] = []
  let maxBay = 0

  for (let i = 0; i < actualLocations.length; i++) {
    const loc = actualLocations[i]
    const bay = getBayNumber(loc)

    if (i > 0) {
      const prevLoc = actualLocations[i - 1]
      const bt = detectBacktrack(prevLoc, loc, maxBay)
      if (bt) {
        backtracks.push(bt)
      }
    }

    if (bay > maxBay) {
      maxBay = bay
    }
  }

  const cadenceCv = calculateCadenceCv(pickTimestamps)

  return {
    optimalDistance,
    actualDistance,
    efficiencyScore,
    backtracks,
    cadenceCv,
  }
}

/**
 * Day 2 Programmatic Qualification Gate.
 *
 * Requirements:
 * - Path Efficiency >= 95.0%
 * - Backtrack Violations === 0
 * - First-Time Pick Accuracy (FTPA) >= 99.0%
 * - Cadence CV <= 0.30
 */
export function evaluateDay2PassGate(
  report: PathEfficiencyReport,
  firstTimePickAccuracy: number
): boolean {
  const meetsEfficiency = report.efficiencyScore >= 95
  const meetsBacktracks = report.backtracks.length === 0
  const meetsFtpa = firstTimePickAccuracy >= 99.0
  const meetsCadence = report.cadenceCv <= 0.30

  return meetsEfficiency && meetsBacktracks && meetsFtpa && meetsCadence
}
