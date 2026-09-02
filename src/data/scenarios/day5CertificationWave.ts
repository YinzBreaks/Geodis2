/**
 * day5CertificationWave.ts
 *
 * DAY 5: Final Floor Certification & LMS Handoff
 *
 * Strategic Objective:
 * Final production qualification. The associate must independently complete a full
 * 50-pick certification wave across 2 aisles (316 and 317), 4 bays per aisle,
 * and all 4 vertical tiers (Levels A through D) into a 9-tote batch cart.
 *
 * Curveballs:
 * - Pick #14: Scratched barcode (requires CTRL+M two-step manual override)
 * - Pick #28: Inventory shortage (requires CTRL+K delta log without conveyor dump)
 * - Pick #39: Damaged carton (requires CTRL+D QA bad-order quarantine)
 *
 * 2 consecutive runs qualifying at >=140 UPH, >=99.5% FTPA, and 0 premature dumps
 * sets isCompetent = true and triggers cryptographic LMS/HRIS handoff.
 */

import {
  WorkflowStep,
  Zone,
  ContentType,
  DifficultyLevel,
  ScanResult,
  type SimulationScenario,
  type PickTask,
  type PickCart,
  type Tote,
  type ToteSlot,
  type WarehouseItem,
} from "@/types/domain"
import type { SpatialLocation } from "@/types/routing"
import { DAY3_LOCATIONS, DAY3_ITEMS } from "@/data/scenarios/day3HighDensityWave"

// ─────────────────────────────────────────────────────────────────────────────
// AISLE 317 4-TIER VERTICAL LOCATIONS (BAYS 01 TO 04, LEVELS A, B, C, D)
// Cross-corridor offset: x = 23 (adjacent to Aisle 316 at x = 20)
// ─────────────────────────────────────────────────────────────────────────────

export const AISLE_317_LOCATIONS: Record<string, SpatialLocation> = {
  // Bay 01 (y = 10m)
  "loc-317-01-A-01": {
    locationId: "loc-317-01-A-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "01",
    level: "A",
    displayLabel: "317-01-A-01",
    checkDigit: "52",
    barcode: "LOC-317-01-A-01",
    spatial: { x: 23, y: 10, aisleSide: "RIGHT", levelHeight: 0.3 },
  },
  "loc-317-01-B-01": {
    locationId: "loc-317-01-B-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "01",
    level: "B",
    displayLabel: "317-01-B-01",
    checkDigit: "89",
    barcode: "LOC-317-01-B-01",
    spatial: { x: 23, y: 10, aisleSide: "RIGHT", levelHeight: 1.1 },
  },
  "loc-317-01-C-01": {
    locationId: "loc-317-01-C-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "01",
    level: "C",
    displayLabel: "317-01-C-01",
    checkDigit: "33",
    barcode: "LOC-317-01-C-01",
    spatial: { x: 23, y: 10, aisleSide: "RIGHT", levelHeight: 1.6 },
  },
  "loc-317-01-D-01": {
    locationId: "loc-317-01-D-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "01",
    level: "D",
    displayLabel: "317-01-D-01",
    checkDigit: "76",
    barcode: "LOC-317-01-D-01",
    spatial: { x: 23, y: 10, aisleSide: "RIGHT", levelHeight: 2.2 },
  },

  // Bay 02 (y = 30m)
  "loc-317-02-A-01": {
    locationId: "loc-317-02-A-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "02",
    level: "A",
    displayLabel: "317-02-A-01",
    checkDigit: "44",
    barcode: "LOC-317-02-A-01",
    spatial: { x: 23, y: 30, aisleSide: "RIGHT", levelHeight: 0.3 },
  },
  "loc-317-02-B-01": {
    locationId: "loc-317-02-B-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "02",
    level: "B",
    displayLabel: "317-02-B-01",
    checkDigit: "81",
    barcode: "LOC-317-02-B-01",
    spatial: { x: 23, y: 30, aisleSide: "RIGHT", levelHeight: 1.1 },
  },
  "loc-317-02-C-01": {
    locationId: "loc-317-02-C-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "02",
    level: "C",
    displayLabel: "317-02-C-01",
    checkDigit: "27",
    barcode: "LOC-317-02-C-01",
    spatial: { x: 23, y: 30, aisleSide: "RIGHT", levelHeight: 1.6 },
  },
  "loc-317-02-D-01": {
    locationId: "loc-317-02-D-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "02",
    level: "D",
    displayLabel: "317-02-D-01",
    checkDigit: "68",
    barcode: "LOC-317-02-D-01",
    spatial: { x: 23, y: 30, aisleSide: "RIGHT", levelHeight: 2.2 },
  },

  // Bay 03 (y = 50m)
  "loc-317-03-A-01": {
    locationId: "loc-317-03-A-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "03",
    level: "A",
    displayLabel: "317-03-A-01",
    checkDigit: "61",
    barcode: "LOC-317-03-A-01",
    spatial: { x: 23, y: 50, aisleSide: "RIGHT", levelHeight: 0.3 },
  },
  "loc-317-03-B-01": {
    locationId: "loc-317-03-B-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "03",
    level: "B",
    displayLabel: "317-03-B-01",
    checkDigit: "95",
    barcode: "LOC-317-03-B-01",
    spatial: { x: 23, y: 50, aisleSide: "RIGHT", levelHeight: 1.1 },
  },
  "loc-317-03-C-01": {
    locationId: "loc-317-03-C-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "03",
    level: "C",
    displayLabel: "317-03-C-01",
    checkDigit: "18",
    barcode: "LOC-317-03-C-01",
    spatial: { x: 23, y: 50, aisleSide: "RIGHT", levelHeight: 1.6 },
  },
  "loc-317-03-D-01": {
    locationId: "loc-317-03-D-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "03",
    level: "D",
    displayLabel: "317-03-D-01",
    checkDigit: "72",
    barcode: "LOC-317-03-D-01",
    spatial: { x: 23, y: 50, aisleSide: "RIGHT", levelHeight: 2.2 },
  },

  // Bay 04 (y = 70m)
  "loc-317-04-A-01": {
    locationId: "loc-317-04-A-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "04",
    level: "A",
    displayLabel: "317-04-A-01",
    checkDigit: "36",
    barcode: "LOC-317-04-A-01",
    spatial: { x: 23, y: 70, aisleSide: "RIGHT", levelHeight: 0.3 },
  },
  "loc-317-04-B-01": {
    locationId: "loc-317-04-B-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "04",
    level: "B",
    displayLabel: "317-04-B-01",
    checkDigit: "84",
    barcode: "LOC-317-04-B-01",
    spatial: { x: 23, y: 70, aisleSide: "RIGHT", levelHeight: 1.1 },
  },
  "loc-317-04-C-01": {
    locationId: "loc-317-04-C-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "04",
    level: "C",
    displayLabel: "317-04-C-01",
    checkDigit: "49",
    barcode: "LOC-317-04-C-01",
    spatial: { x: 23, y: 70, aisleSide: "RIGHT", levelHeight: 1.6 },
  },
  "loc-317-04-D-01": {
    locationId: "loc-317-04-D-01",
    zone: Zone.Z1,
    aisle: "317",
    bay: "04",
    level: "D",
    displayLabel: "317-04-D-01",
    checkDigit: "91",
    barcode: "LOC-317-04-D-01",
    spatial: { x: 23, y: 70, aisleSide: "RIGHT", levelHeight: 2.2 },
  },
}

export const DAY5_LOCATIONS: Record<string, SpatialLocation> = {
  ...DAY3_LOCATIONS,
  ...AISLE_317_LOCATIONS,
}

// ─────────────────────────────────────────────────────────────────────────────
// 9-TOTE BATCH CART SETUP
// ─────────────────────────────────────────────────────────────────────────────

function makeTote(slot: ToteSlot, barcode: string): Tote {
  return {
    toteId: `TOTE-${String(slot).padStart(2, "0")}`,
    barcode,
    slot,
    pickedItems: [],
    isComplete: false,
    placedOnConveyor: false,
  }
}

export const day5Totes: Tote[] = [
  makeTote(1, "TOTE-01"),
  makeTote(2, "TOTE-02"),
  makeTote(3, "TOTE-03"),
  makeTote(4, "TOTE-04"),
  makeTote(5, "TOTE-05"),
  makeTote(6, "TOTE-06"),
  makeTote(7, "TOTE-07"),
  makeTote(8, "TOTE-08"),
  makeTote(9, "TOTE-09"),
]

export const day5Cart: PickCart = {
  cartId: "cart-day5-cert",
  cartBarcode: "CART-05",
  totes: day5Totes,
  zone: Zone.Z1,
  taskGroup: "BBWD",
  roundNumber: 1,
  totalItemsPicked: 0,
  isBuilt: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// 50-PICK PRODUCTION CERTIFICATION QUEUE
// 25 picks in Aisle 316 (Bays 01-04) -> 25 picks in Aisle 317 (Bays 01-04)
// Slots 1-5 receive 6 picks each; Slots 6-9 receive 5 picks each (Total: 50)
// ─────────────────────────────────────────────────────────────────────────────

const locationKeysAisle316 = Object.keys(DAY3_LOCATIONS) // 16 locations
const locationKeysAisle317 = Object.keys(AISLE_317_LOCATIONS) // 16 locations
const itemKeys = Object.keys(DAY3_ITEMS)

export const day5PickQueue: PickTask[] = Array.from({ length: 50 }, (_, i) => {
  const pickIndex = i // 0-based
  const pickNumber = i + 1 // 1-based

  // Cross-aisle distribution: first 25 in Aisle 316, next 25 in Aisle 317
  const isAisle316 = pickIndex < 25
  const locKey = isAisle316
    ? locationKeysAisle316[pickIndex % locationKeysAisle316.length]
    : locationKeysAisle317[(pickIndex - 25) % locationKeysAisle317.length]
  const location = DAY5_LOCATIONS[locKey]

  const itemKey = itemKeys[pickIndex % itemKeys.length]
  const item = DAY3_ITEMS[itemKey]

  // Slot allocation cycling 1 to 9 (Slots 1-5 get 6 picks; Slots 6-9 get 5 picks)
  const targetSlot = ((pickIndex % 9) + 1) as ToteSlot
  const targetToteId = `TOTE-${String(targetSlot).padStart(2, "0")}`

  // Standard pick task
  const task: PickTask = {
    pickTaskId: `d5-pick-${String(pickNumber).padStart(3, "0")}`,
    orderNumber: `ORD-D5-${String(5000 + pickNumber)}`,
    item,
    location,
    quantityRequired: 1,
    targetToteId,
    targetSlot,
  }

  // Phase C Curveball #1: Pick #14 (index 13) -> Scratched Barcode (CTRL+M)
  if (pickNumber === 14) {
    task.itemDefect = "SCRATCHED_BARCODE"
  }

  // Phase C Curveball #2: Pick #28 (index 27) -> Inventory Shortage (CTRL+K)
  if (pickNumber === 28) {
    task.quantityRequired = 3
  }

  // Phase C Curveball #3: Pick #39 (index 38) -> Damaged Packaging (CTRL+D)
  if (pickNumber === 39) {
    task.itemDefect = "CRUSHED_CARTON"
  }

  return task
})

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const day5Scenario: SimulationScenario & { isClusterWave?: boolean } = {
  moduleId: "day5-final-certification",
  title: "DAY 5: Final Floor Certification & LMS Handoff",
  description:
    "Comprehensive 50-pick production qualification wave across Aisles 316 & 317, testing sustained 140+ UPH, 99.5%+ accuracy, and live exception recovery across 2 consecutive runs.",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.ADVANCED,
  estimatedMinutes: 22,
  zone: Zone.Z1,
  pickCount: 50,
  toteCount: 9,
  isClusterWave: true,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "d5-err-001",
      injectAtPickIndex: 13, // Pick #14
      errorType: ScanResult.ITEM_DAMAGED,
      description: "Degraded packaging requires manual UPC override (CTRL+M)",
      expectedResolution: [
        WorkflowStep.EX_DAMAGED_ITEM,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.2",
    },
    {
      scenarioId: "d5-err-002",
      injectAtPickIndex: 27, // Pick #28
      errorType: ScanResult.ITEM_NOT_FOUND,
      description: "Physical inventory shortage requires short pick logging (CTRL+K)",
      expectedResolution: [
        WorkflowStep.EX_SHORT_INVENTORY,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.6",
    },
    {
      scenarioId: "d5-err-003",
      injectAtPickIndex: 38, // Pick #39
      errorType: ScanResult.ITEM_DAMAGED,
      description: "Crushed carton requires QA bad-order bin quarantine (CTRL+D)",
      expectedResolution: [
        WorkflowStep.EX_DAMAGED_ITEM,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.2",
    },
  ],
  passCriteria: {
    minScore: 98,
    maxErrors: 1,
  },
  scoringWeights: {
    accuracy: 0.6,
    speed: 0.4,
  },
  targetPicksPerHour: 140,
  version: "2.0.0",
  lastUpdated: "2026-09-02",
}

export const DAY5_CERTIFICATION_WAVE = {
  scenario: day5Scenario,
  pickQueue: day5PickQueue,
  cart: day5Cart,
}
