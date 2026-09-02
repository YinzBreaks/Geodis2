/**
 * day3HighDensityWave.ts
 *
 * DAY 3: High-Density Wave Picking & Vertical Tier Mastery
 *
 * Strategic Objective:
 * Stresses cognitive capacity and cart discipline across all 4 vertical tiers
 * (Level A = Floor, Level B = Ergonomic Golden Zone, Level C = Chest Height,
 * Level D = Top Reach) into a fully populated 9-tote cart (3 tiers x 3 slots)
 * without mis-slotting or losing the 4-beat rhythm.
 *
 * Structure:
 * - Phase A: Vertical Tier Familiarization (6 picks, Bay 01 A -> B -> C -> D)
 * - Phase B: 9-Tote Full Cart Saturation (14 picks, rapid tier-shifting put-to-slot)
 * - Phase C: The Vertical Distractor Trap (4 picks, Levels C & D co-mingled packaging)
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

// ─────────────────────────────────────────────────────────────────────────────
// AISLE 316 4-TIER VERTICAL LOCATIONS (BAYS 01 TO 04, LEVELS A, B, C, D)
// ─────────────────────────────────────────────────────────────────────────────

export const DAY3_LOCATIONS: Record<string, SpatialLocation> = {
  // ── Bay 01 (y = 10m) ──────────────────────────────────────────────────────
  "loc-316-01-A-01": {
    locationId: "loc-316-01-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "A",
    displayLabel: "316-01-A-01",
    checkDigit: "47",
    barcode: "LOC-316-01-A-01",
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 0.3 },
  },
  "loc-316-01-B-01": {
    locationId: "loc-316-01-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "B",
    displayLabel: "316-01-B-01",
    checkDigit: "83",
    barcode: "LOC-316-01-B-01",
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 1.1 },
  },
  "loc-316-01-C-01": {
    locationId: "loc-316-01-C-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "C",
    displayLabel: "316-01-C-01",
    checkDigit: "62",
    barcode: "LOC-316-01-C-01",
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 1.6 },
  },
  "loc-316-01-D-01": {
    locationId: "loc-316-01-D-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "D",
    displayLabel: "316-01-D-01",
    checkDigit: "14",
    barcode: "LOC-316-01-D-01",
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 2.2 },
  },

  // ── Bay 02 (y = 30m) ──────────────────────────────────────────────────────
  "loc-316-02-A-01": {
    locationId: "loc-316-02-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "A",
    displayLabel: "316-02-A-01",
    checkDigit: "91",
    barcode: "LOC-316-02-A-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 0.3 },
  },
  "loc-316-02-B-01": {
    locationId: "loc-316-02-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "B",
    displayLabel: "316-02-B-01",
    checkDigit: "35",
    barcode: "LOC-316-02-B-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 1.1 },
  },
  "loc-316-02-C-01": {
    locationId: "loc-316-02-C-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "C",
    displayLabel: "316-02-C-01",
    checkDigit: "78",
    barcode: "LOC-316-02-C-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 1.6 },
  },
  "loc-316-02-D-01": {
    locationId: "loc-316-02-D-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "D",
    displayLabel: "316-02-D-01",
    checkDigit: "26",
    barcode: "LOC-316-02-D-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 2.2 },
  },

  // ── Bay 03 (y = 50m) ──────────────────────────────────────────────────────
  "loc-316-03-A-01": {
    locationId: "loc-316-03-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "A",
    displayLabel: "316-03-A-01",
    checkDigit: "53",
    barcode: "LOC-316-03-A-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 0.3 },
  },
  "loc-316-03-B-01": {
    locationId: "loc-316-03-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "B",
    displayLabel: "316-03-B-01",
    checkDigit: "19",
    barcode: "LOC-316-03-B-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 1.1 },
  },
  "loc-316-03-C-01": {
    locationId: "loc-316-03-C-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "C",
    displayLabel: "316-03-C-01",
    checkDigit: "82",
    barcode: "LOC-316-03-C-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 1.6 },
  },
  "loc-316-03-D-01": {
    locationId: "loc-316-03-D-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "D",
    displayLabel: "316-03-D-01",
    checkDigit: "64",
    barcode: "LOC-316-03-D-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 2.2 },
  },

  // ── Bay 04 (y = 70m) ──────────────────────────────────────────────────────
  "loc-316-04-A-01": {
    locationId: "loc-316-04-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "A",
    displayLabel: "316-04-A-01",
    checkDigit: "37",
    barcode: "LOC-316-04-A-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 0.3 },
  },
  "loc-316-04-B-01": {
    locationId: "loc-316-04-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "B",
    displayLabel: "316-04-B-01",
    checkDigit: "92",
    barcode: "LOC-316-04-B-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 1.1 },
  },
  "loc-316-04-C-01": {
    locationId: "loc-316-04-C-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "C",
    displayLabel: "316-04-C-01",
    checkDigit: "41",
    barcode: "LOC-316-04-C-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 1.6 },
  },
  "loc-316-04-D-01": {
    locationId: "loc-316-04-D-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "D",
    displayLabel: "316-04-D-01",
    checkDigit: "75",
    barcode: "LOC-316-04-D-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 2.2 },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE ITEMS
// ─────────────────────────────────────────────────────────────────────────────

export const DAY3_ITEMS: Record<string, WarehouseItem> = {
  "item-widget-blue": {
    itemId: "item-widget-blue",
    sku: "024505572",
    upcBarcode: "00024505572001",
    description: "Standard Blue Widget 250ml",
    unitOfMeasure: "EA",
    lastFourDigits: "2001",
  },
  "item-widget-green": {
    itemId: "item-widget-green",
    sku: "024505573",
    upcBarcode: "00024505573002",
    description: "Standard Green Widget 250ml",
    unitOfMeasure: "EA",
    lastFourDigits: "3002",
  },
  "item-widget-amber": {
    itemId: "item-widget-amber",
    sku: "024505574",
    upcBarcode: "00024505574003",
    description: "Amber Industrial Cleaner 500ml",
    unitOfMeasure: "EA",
    lastFourDigits: "4003",
  },
  "item-widget-red": {
    itemId: "item-widget-red",
    sku: "024505575",
    upcBarcode: "00024505575004",
    description: "Industrial Red Lubricant 300ml",
    unitOfMeasure: "EA",
    lastFourDigits: "5004",
  },
  "item-torque-wrench": {
    itemId: "item-torque-wrench",
    sku: "024505590",
    upcBarcode: "00024505590010",
    description: "Precision Torque Wrench 1/2in",
    unitOfMeasure: "EA",
    lastFourDigits: "0010",
  },
  "item-grease-gun": {
    itemId: "item-grease-gun",
    sku: "024505592",
    upcBarcode: "00024505592033",
    description: "Heavy Duty Pistol Grease Gun",
    unitOfMeasure: "EA",
    lastFourDigits: "2033",
  },
  // Phase C Co-mingled Vertical Trap Items
  "item-alpha-level-c": {
    itemId: "item-alpha-level-c",
    sku: "024505601",
    upcBarcode: "00024505601111",
    description: "Aero-Seal Polymer (Standard Viscosity)",
    unitOfMeasure: "EA",
    lastFourDigits: "1111",
  },
  "item-alpha-level-d": {
    itemId: "item-alpha-level-d",
    sku: "024505602",
    upcBarcode: "00024505602222",
    description: "Aero-Seal Polymer (High Viscosity)",
    unitOfMeasure: "EA",
    lastFourDigits: "2222",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CART & TOTES (9-TOTE CART FULLY SATURATED)
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

export const day3Totes: Tote[] = [
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

export const day3Cart: PickCart = {
  cartId: "cart-day3-001",
  cartBarcode: "CART-03",
  totes: day3Totes,
  zone: Zone.Z1,
  taskGroup: "BBWD",
  roundNumber: 1,
  totalItemsPicked: 0,
  isBuilt: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// 24 PICKS PICK QUEUE (6 FAMILIARIZATION + 14 FULL SATURATION + 4 TRAP)
// ─────────────────────────────────────────────────────────────────────────────

export const day3PickQueue: PickTask[] = [
  // ── Phase A: Vertical Tier Familiarization (6 Picks, Bay 01 A->B->C->D) ──
  {
    pickTaskId: "d3-pick-001",
    orderNumber: "ORD-D3-3001",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-01-A-01"], // Level A
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-002",
    orderNumber: "ORD-D3-3002",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-01-B-01"], // Level B
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-003",
    orderNumber: "ORD-D3-3003",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-01-C-01"], // Level C
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-004",
    orderNumber: "ORD-D3-3004",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-01-D-01"], // Level D
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-005",
    orderNumber: "ORD-D3-3005",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-01-A-01"], // Level A
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-006",
    orderNumber: "ORD-D3-3006",
    item: DAY3_ITEMS["item-grease-gun"],
    location: DAY3_LOCATIONS["loc-316-01-B-01"], // Level B
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },

  // ── Phase B: 9-Tote Full Cart Saturation (14 Picks Across All 3 Cart Tiers) ──
  {
    pickTaskId: "d3-pick-007",
    orderNumber: "ORD-D3-3007",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-01-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-02", // Tier 1 Bottom
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-008",
    orderNumber: "ORD-D3-3008",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-01-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-08", // Tier 3 Top
    targetSlot: 8,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-009",
    orderNumber: "ORD-D3-3009",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-02-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-05", // Tier 2 Middle
    targetSlot: 5,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-010",
    orderNumber: "ORD-D3-3010",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-02-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-09", // Tier 3 Top
    targetSlot: 9,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-011",
    orderNumber: "ORD-D3-3011",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-02-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01", // Tier 1 Bottom
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-012",
    orderNumber: "ORD-D3-3012",
    item: DAY3_ITEMS["item-grease-gun"],
    location: DAY3_LOCATIONS["loc-316-02-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-06", // Tier 2 Middle
    targetSlot: 6,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-013",
    orderNumber: "ORD-D3-3013",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-03-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-03", // Tier 1 Bottom
    targetSlot: 3,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-014",
    orderNumber: "ORD-D3-3014",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-03-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-07", // Tier 3 Top
    targetSlot: 7,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-015",
    orderNumber: "ORD-D3-3015",
    item: DAY3_ITEMS["item-widget-amber"],
    location: DAY3_LOCATIONS["loc-316-03-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-04", // Tier 2 Middle
    targetSlot: 4,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-016",
    orderNumber: "ORD-D3-3016",
    item: DAY3_ITEMS["item-widget-red"],
    location: DAY3_LOCATIONS["loc-316-03-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-08", // Tier 3 Top
    targetSlot: 8,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-017",
    orderNumber: "ORD-D3-3017",
    item: DAY3_ITEMS["item-torque-wrench"],
    location: DAY3_LOCATIONS["loc-316-04-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-02", // Tier 1 Bottom
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-018",
    orderNumber: "ORD-D3-3018",
    item: DAY3_ITEMS["item-grease-gun"],
    location: DAY3_LOCATIONS["loc-316-04-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-05", // Tier 2 Middle
    targetSlot: 5,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-019",
    orderNumber: "ORD-D3-3019",
    item: DAY3_ITEMS["item-widget-blue"],
    location: DAY3_LOCATIONS["loc-316-04-C-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-09", // Tier 3 Top
    targetSlot: 9,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-020",
    orderNumber: "ORD-D3-3020",
    item: DAY3_ITEMS["item-widget-green"],
    location: DAY3_LOCATIONS["loc-316-04-D-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01", // Tier 1 Bottom
    targetSlot: 1,
    isExpress: false,
  },

  // ── Phase C: The Vertical Distractor Trap (4 Picks, Co-Mingled C & D) ────
  {
    pickTaskId: "d3-pick-021",
    orderNumber: "ORD-D3-3021",
    item: DAY3_ITEMS["item-alpha-level-c"],
    location: DAY3_LOCATIONS["loc-316-03-C-01"], // Level C Check Digit [82]
    quantityRequired: 1,
    targetToteId: "TOTE-04", // Tier 2 Middle
    targetSlot: 4,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-022",
    orderNumber: "ORD-D3-3022",
    item: DAY3_ITEMS["item-alpha-level-d"],
    location: DAY3_LOCATIONS["loc-316-03-D-01"], // Level D Check Digit [64] - Co-mingled trap
    quantityRequired: 1,
    targetToteId: "TOTE-07", // Tier 3 Top
    targetSlot: 7,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-023",
    orderNumber: "ORD-D3-3023",
    item: DAY3_ITEMS["item-alpha-level-c"],
    location: DAY3_LOCATIONS["loc-316-04-C-01"], // Level C Check Digit [41]
    quantityRequired: 1,
    targetToteId: "TOTE-06", // Tier 2 Middle
    targetSlot: 6,
    isExpress: false,
  },
  {
    pickTaskId: "d3-pick-024",
    orderNumber: "ORD-D3-3024",
    item: DAY3_ITEMS["item-alpha-level-d"],
    location: DAY3_LOCATIONS["loc-316-04-D-01"], // Level D Check Digit [75] - Co-mingled trap
    quantityRequired: 1,
    targetToteId: "TOTE-09", // Tier 3 Top
    targetSlot: 9,
    isExpress: false,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const day3Scenario: SimulationScenario & { isClusterWave?: boolean } = {
  moduleId: "day3-high-density-wave",
  title: "DAY 3: High-Density Wave Picking & Vertical Tier Mastery",
  description:
    "Cognitive & cart discipline stress drill: High-density wave picking across all 4 vertical tiers (A, B, C, D) into a fully populated 9-tote cart (Tiers 1, 2, 3) with rapid put-to-slot tier shifting.",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.INTERMEDIATE,
  estimatedMinutes: 10,
  zone: Zone.Z1,
  pickCount: 24,
  toteCount: 9,
  isClusterWave: true,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "d3-err-001",
      injectAtPickIndex: 5,
      errorType: ScanResult.WRONG_LOCATION,
      description: "Mis-read vertical check digit — requires location verification",
      expectedResolution: [
        WorkflowStep.EX_INCORRECT_LOCATION,
        WorkflowStep.EX_PRESS_CTRL_W,
        WorkflowStep.PK_VERIFY_LOCATION,
      ],
      sopReference: "BBWD-WI-030 §6.4",
    },
    {
      scenarioId: "d3-err-002",
      injectAtPickIndex: 15,
      errorType: ScanResult.WRONG_ITEM,
      isLastItemAtLocation: true,
      description: "Co-mingled vertical distractor scanned — requires pick face verification",
      expectedResolution: [
        WorkflowStep.EX_INVALID_ITEM_LAST,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.1",
    },
  ],
  passCriteria: {
    minScore: 92,
    maxErrors: 1,
  },
  scoringWeights: {
    accuracy: 0.6,
    speed: 0.4,
  },
  targetPicksPerHour: 135,
  version: "2.0.0",
  lastUpdated: "2026-09-02",
}

export const DAY3_HIGH_DENSITY_WAVE = {
  scenario: day3Scenario,
  pickQueue: day3PickQueue,
  cart: day3Cart,
}
