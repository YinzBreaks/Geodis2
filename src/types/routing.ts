/**
 * routing.ts — Spatial Map & Traversal Data Contracts
 *
 * Defines spatial coordinate models, aisle geometry, backtracking telemetry,
 * and SVG polyline visualizer helpers for Day 2 Serpentine Routing.
 *
 * Per GEODIS standard: Aisle 316 has distinct Left and Right racking faces
 * separated by a defined aisle corridor width (typically ~3.0 meters).
 */

import type { WarehouseLocation, PickTask, ScanEvent } from "@/types/domain"

export type AisleSide = "LEFT" | "RIGHT"

export interface SpatialCoordinates {
  /** Distance along the longitudinal aisle corridor axis (in meters) */
  y: number
  /** Distance across or rack face side (in meters or coordinate space) */
  x: number
  /** Which rack face the shelf slot faces */
  aisleSide: AisleSide
  /** Optional shelf level elevation (meters): Level A = 0.2m, Level B = 1.2m */
  levelHeight?: number
}

export interface SpatialLocation extends WarehouseLocation {
  spatial?: SpatialCoordinates
}

export interface BacktrackEvent {
  eventId: string
  fromLocationId: string
  fromDisplayLabel: string
  fromBay: number
  toLocationId: string
  toDisplayLabel: string
  toBay: number
  distanceTraveled: number
  timestamp: Date
  reason: "BAY_REGRESSION" | "LEVEL_REGRESSION"
}

export interface PathEfficiencyReport {
  /** Optimal planned serpentine path distance (meters) */
  optimalDistance: number
  /** Actual path distance traversed by trainee (meters) */
  actualDistance: number
  /** Efficiency ratio: (optimalDistance / actualDistance) * 100 capped at 100% */
  efficiencyScore: number
  /** Backtracking violations detected */
  backtracks: BacktrackEvent[]
  /** Cadence consistency coefficient of variation (sigma / mu) */
  cadenceCv: number
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP VIEWPORT HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate an SVG polyline points attribute string from an array of spatial locations.
 */
export function generatePolylinePoints(
  locations: { x: number; y: number }[]
): string {
  return locations.map((loc) => `${loc.x},${loc.y}`).join(" ")
}

/**
 * Generate the optimal planned serpentine polyline for a list of pick tasks.
 */
export function generateOptimalPolyline(picks: PickTask[]): string {
  const points = picks
    .map((p) => (p.location as SpatialLocation).spatial)
    .filter((s): s is SpatialCoordinates => Boolean(s))
    .map((s) => ({ x: s.x, y: s.y }))

  return generatePolylinePoints(points)
}

/**
 * Generate the actual path traversed by the trainee from scan events.
 */
export function generateActualPathPolyline(
  locations: (SpatialCoordinates | undefined)[]
): string {
  const points = locations
    .filter((s): s is SpatialCoordinates => Boolean(s))
    .map((s) => ({ x: s.x, y: s.y }))

  return generatePolylinePoints(points)
}

/**
 * Compute the current cart node position along the center corridor.
 */
export function getCartNodePosition(
  currentPickIndex: number,
  picks: PickTask[]
): { x: number; y: number } {
  const currentPick = picks[currentPickIndex] ?? picks[picks.length - 1]
  const spatial = (currentPick?.location as SpatialLocation)?.spatial

  // Center corridor is x = 50 in our normalized coordinate space
  return {
    x: 50,
    y: spatial?.y ?? 10,
  }
}
