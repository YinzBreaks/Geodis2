/**
 * day4IndustrialExceptions.ts
 *
 * DAY 4: Industrial Exceptions, Short Picks, & Hazmat Handling
 *
 * Strategic Objective:
 * Eradicates premature conveyor tote dumping on warehouse defects.
 * Trains non-destructive exception resolution:
 * - Barcode degradation (CTRL+M two-step override)
 * - Physical bin shortages (CTRL+K inventory delta logging + tote retention)
 * - Damaged packaging (CTRL+D QA quarantine)
 * - Hazardous chemical spills (CTRL+H safety stop + TOTE-09-HAZ segregation)
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
import { DAY3_LOCATIONS, DAY3_ITEMS } from "@/data/scenarios/day3HighDensityWave"

function makeTote(slot: ToteSlot, barcode: string): Tote {
  const toteId = slot === 9 ? "TOTE-09-HAZ" : `TOTE-${String(slot).padStart(2, "0")}`
  return {
    toteId,
    barcode,
    slot,
    pickedItems: [],
    isComplete: false,
    placedOnConveyor: false,
  }
}

export const day4Totes: Tote[] = [
  makeTote(1, "TOTE-01"),
  makeTote(2, "TOTE-02"),
  makeTote(3, "TOTE-03"),
  makeTote(4, "TOTE-04"),
  makeTote(5, "TOTE-05"),
  makeTote(6, "TOTE-06"),
  makeTote(7, "TOTE-07"),
  makeTote(8, "TOTE-08"),
  makeTote(9, "TOTE-09-HAZ"), // Dedicated hazmat containment tote
]

export const day4Cart: PickCart = {
  cartId: "cart-day4-001",
  cartBarcode: "CART-04",
  totes: day4Totes,
  zone: Zone.Z1,
  taskGroup: "BBWD",
  roundNumber: 1,
  totalItemsPicked: 0,
  isBuilt: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// 20 PICKS QUEUE (DISTRIBUTED EVENLY >= 2 PICKS PER TOTE)
// ─────────────────────────────────────────────────────────────────────────────

export const day4PickQueue: PickTask[] = [
  // ── Phase A: Barcode Degradation (6 Picks) ────────────────────────────────
  {
    pickTaskId: "d4-pick-001",
    orderNumber: "ORD-D4-4001",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-01-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
  },
  {
    pickTaskId: "d4-pick-002",
    orderNumber: "ORD-D4-4002",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-01-B-01"], // CD: 83
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    itemDefect: "SCRATCHED_BARCODE", // Requires CTRL+M override
  },
  {
    pickTaskId: "d4-pick-003",
    orderNumber: "ORD-D4-4003",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-01-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
  },
  {
    pickTaskId: "d4-pick-004",
    orderNumber: "ORD-D4-4004",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-02-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-04",
    targetSlot: 4,
  },
  {
    pickTaskId: "d4-pick-005",
    orderNumber: "ORD-D4-4005",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-02-C-01"], // CD: 78
    quantityRequired: 1,
    targetToteId: "TOTE-05",
    targetSlot: 5,
    itemDefect: "SCRATCHED_BARCODE", // Requires CTRL+M override
  },
  {
    pickTaskId: "d4-pick-006",
    orderNumber: "ORD-D4-4006",
    item: DAY3_ITEMS["item-grease-gun"],
    location: DAY3_LOCATIONS["loc-316-02-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-06",
    targetSlot: 6,
  },

  // ── Phase B: Physical Bin Shortages (8 Picks) ─────────────────────────────
  {
    pickTaskId: "d4-pick-007",
    orderNumber: "ORD-D4-4007",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-02-B-01"],
    quantityRequired: 4, // Partial shortage (actual found: 2, delta: 2)
    targetToteId: "TOTE-07",
    targetSlot: 7,
  },
  {
    pickTaskId: "d4-pick-008",
    orderNumber: "ORD-D4-4008",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-03-A-01"],
    quantityRequired: 1, // Empty slot (actual found: 0, delta: 1)
    targetToteId: "TOTE-08",
    targetSlot: 8,
  },
  {
    pickTaskId: "d4-pick-009",
    orderNumber: "ORD-D4-4009",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-03-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-09-HAZ",
    targetSlot: 9,
  },
  {
    pickTaskId: "d4-pick-010",
    orderNumber: "ORD-D4-4010",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-03-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
  },
  {
    pickTaskId: "d4-pick-011",
    orderNumber: "ORD-D4-4011",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-03-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
  },
  {
    pickTaskId: "d4-pick-012",
    orderNumber: "ORD-D4-4012",
    item: DAY3_ITEMS["item-grease-gun"],
    location: DAY3_LOCATIONS["loc-316-04-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
  },
  {
    pickTaskId: "d4-pick-013",
    orderNumber: "ORD-D4-4013",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-04-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-04",
    targetSlot: 4,
  },
  {
    pickTaskId: "d4-pick-014",
    orderNumber: "ORD-D4-4014",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-04-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-05",
    targetSlot: 5,
  },

  // ── Phase C: Damaged Goods & Hazmat Protocol (6 Picks) ────────────────────
  {
    pickTaskId: "d4-pick-015",
    orderNumber: "ORD-D4-4015",
    item: DAY3_ITEMS["item-alpha-level-c"],
    location: DAY3_LOCATIONS["loc-316-03-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-06",
    targetSlot: 6,
    itemDefect: "CRUSHED_CARTON", // Requires CTRL+D QA quarantine
  },
  {
    pickTaskId: "d4-pick-016",
    orderNumber: "ORD-D4-4016",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-03-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-07",
    targetSlot: 7,
  },
  {
    pickTaskId: "d4-pick-017",
    orderNumber: "ORD-D4-4017",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-04-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-08",
    targetSlot: 8,
  },
  {
    pickTaskId: "d4-pick-018",
    orderNumber: "ORD-D4-4018",
    item: DAY3_ITEMS["item-alpha-level-d"],
    location: DAY3_LOCATIONS["loc-316-04-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-09-HAZ",
    targetSlot: 9,
    itemDefect: "HAZMAT_SPILL", // Requires CTRL+H safety stop & segregation
  },
  {
    pickTaskId: "d4-pick-019",
    orderNumber: "ORD-D4-4019",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-04-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
  },
  {
    pickTaskId: "d4-pick-020",
    orderNumber: "ORD-D4-4020",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-04-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const day4Scenario: SimulationScenario & { isClusterWave?: boolean } = {
  moduleId: "day4-industrial-exceptions",
  title: "DAY 4: Industrial Exceptions, Short Picks, & Hazmat Handling",
  description:
    "Eradicates premature tote dump habits. Non-destructive resolution of damaged packaging (CTRL+D), degraded barcodes (CTRL+M), inventory shortages (CTRL+K), and hazmat spills (CTRL+H).",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.ADVANCED,
  estimatedMinutes: 12,
  zone: Zone.Z1,
  pickCount: 20,
  toteCount: 9,
  isClusterWave: true,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "d4-err-001",
      injectAtPickIndex: 4,
      errorType: ScanResult.ITEM_DAMAGED,
      description: "Degraded/unreadable barcode requires manual keyboard override",
      expectedResolution: [
        WorkflowStep.EX_DAMAGED_ITEM,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.2",
    },
    {
      scenarioId: "d4-err-002",
      injectAtPickIndex: 11,
      errorType: ScanResult.ITEM_NOT_FOUND,
      description: "Inventory shortage requires short reason log without conveyor dump",
      expectedResolution: [
        WorkflowStep.EX_SHORT_INVENTORY,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.6",
    },
  ],
  passCriteria: {
    minScore: 94,
    maxErrors: 0,
  },
  scoringWeights: {
    accuracy: 0.6,
    speed: 0.4,
  },
  targetPicksPerHour: 140,
  version: "2.0.0",
  lastUpdated: "2026-09-02",
}

export const DAY4_INDUSTRIAL_EXCEPTIONS = {
  scenario: day4Scenario,
  pickQueue: day4PickQueue,
  cart: day4Cart,
}
