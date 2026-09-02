/**
 * day1EquipmentCheckDigit.ts
 *
 * DAY 1: Equipment Familiarity, Cart Prep, & The 4-Beat Check-Digit Protocol
 *
 * Strategic Objective:
 * Establishes neuromuscular discipline and destroys bad habits before trainees
 * ever touch an active warehouse floor. Conditions the standard 4-beat cycle:
 * Look Bin -> Scan/Key Check Digit -> Scan SKU UPC -> Key Qty + Enter -> Scan Cart Tote.
 *
 * Structure:
 * - Phase A: Cart Build & Tiered Tote Setup (Top, Middle, Bottom tiers)
 * - Phase B: Check-Digit Muscle Memory (6 single-piece picks in Bay 01)
 * - Phase C: The Reverse-Contrast Test (2 adjacent slots with identical artwork packaging)
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
  type WarehouseLocation,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// LOCATIONS WITH GEODIS-STANDARD ABLP & REVERSE-CONTRAST CHECK DIGITS
// ─────────────────────────────────────────────────────────────────────────────

export const DAY1_LOCATIONS: Record<string, WarehouseLocation> = {
  "loc-316-01-A-01": {
    locationId: "loc-316-01-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "A",
    displayLabel: "316-01-A-01",
    checkDigit: "18",
    barcode: "LOC-316-01-A-01",
  },
  "loc-316-01-A-02": {
    locationId: "loc-316-01-A-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "A",
    displayLabel: "316-01-A-02",
    checkDigit: "47",
    barcode: "LOC-316-01-A-02",
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
  },
  // Phase C: Reverse-Contrast Adjacent Slots (Identical packaging / Artwork trap)
  "loc-316-01-B-02": {
    locationId: "loc-316-01-B-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "B",
    displayLabel: "316-01-B-02",
    checkDigit: "52",
    barcode: "LOC-316-01-B-02",
  },
  "loc-316-01-B-03": {
    locationId: "loc-316-01-B-03",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "B",
    displayLabel: "316-01-B-03",
    checkDigit: "29",
    barcode: "LOC-316-01-B-03",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE ITEMS
// ─────────────────────────────────────────────────────────────────────────────

export const DAY1_ITEMS: Record<string, WarehouseItem> = {
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
  // Phase C: Reverse-Contrast Items (Visually identical silver containers)
  "item-alpha-pro": {
    itemId: "item-alpha-pro",
    sku: "024505580",
    upcBarcode: "00024505580099",
    description: "Alpha-Pro Silver 500ml (Concentrate)",
    unitOfMeasure: "EA",
    lastFourDigits: "0099",
  },
  "item-alpha-lite": {
    itemId: "item-alpha-lite",
    sku: "024505581",
    upcBarcode: "00024505581088",
    description: "Alpha-Lite Silver 500ml (Ready-To-Use)",
    unitOfMeasure: "EA",
    lastFourDigits: "1088",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CART & TOTE SETUP (3-Tier Cart with 3 Active Order Totes)
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

export const day1Totes: Tote[] = [
  makeTote(1, "TOTE-01"), // Top Tier
  makeTote(2, "TOTE-02"), // Middle Tier
  makeTote(3, "TOTE-03"), // Bottom Tier
  makeTote(4, "TOTE-04"),
  makeTote(5, "TOTE-05"),
  makeTote(6, "TOTE-06"),
  makeTote(7, "TOTE-07"),
  makeTote(8, "TOTE-08"),
  makeTote(9, "TOTE-09"),
]

export const day1Cart: PickCart = {
  cartId: "cart-day1-001",
  cartBarcode: "CART-01",
  totes: day1Totes,
  zone: Zone.Z1,
  taskGroup: "BBWD",
  roundNumber: 1,
  totalItemsPicked: 0,
  isBuilt: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// DAY 1 PICK QUEUE (8 PICKS TOTAL: 6 CADENCE + 2 REVERSE-CONTRAST)
// ─────────────────────────────────────────────────────────────────────────────

export const day1PickQueue: PickTask[] = [
  // Slot 1 (Top Tier): Picks 1–4
  {
    pickTaskId: "d1-pick-001",
    orderNumber: "ORD-D1-1001",
    item: DAY1_ITEMS["item-widget-blue"],
    location: DAY1_LOCATIONS["loc-316-01-A-01"], // CD: 18
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-002",
    orderNumber: "ORD-D1-1002",
    item: DAY1_ITEMS["item-widget-green"],
    location: DAY1_LOCATIONS["loc-316-01-A-02"], // CD: 47
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-003",
    orderNumber: "ORD-D1-1003",
    item: DAY1_ITEMS["item-widget-amber"],
    location: DAY1_LOCATIONS["loc-316-01-B-01"], // CD: 83
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-004",
    orderNumber: "ORD-D1-1004",
    item: DAY1_ITEMS["item-widget-blue"],
    location: DAY1_LOCATIONS["loc-316-01-A-01"], // CD: 18
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },

  // Slot 2 (Middle Tier): Picks 5–8
  {
    pickTaskId: "d1-pick-005",
    orderNumber: "ORD-D1-1005",
    item: DAY1_ITEMS["item-widget-green"],
    location: DAY1_LOCATIONS["loc-316-01-A-02"], // CD: 47
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-006",
    orderNumber: "ORD-D1-1006",
    item: DAY1_ITEMS["item-widget-amber"],
    location: DAY1_LOCATIONS["loc-316-01-B-01"], // CD: 83
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-007",
    orderNumber: "ORD-D1-1007",
    item: DAY1_ITEMS["item-widget-blue"],
    location: DAY1_LOCATIONS["loc-316-01-A-01"], // CD: 18
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-008",
    orderNumber: "ORD-D1-1008",
    item: DAY1_ITEMS["item-widget-green"],
    location: DAY1_LOCATIONS["loc-316-01-A-02"], // CD: 47
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },

  // Slot 3 (Bottom Tier): Picks 9–10 (Phase C Reverse-Contrast Mis-Pick Traps)
  {
    pickTaskId: "d1-pick-009",
    orderNumber: "ORD-D1-1009",
    item: DAY1_ITEMS["item-alpha-pro"],
    location: DAY1_LOCATIONS["loc-316-01-B-02"], // CD: 52
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },
  {
    pickTaskId: "d1-pick-010",
    orderNumber: "ORD-D1-1010",
    item: DAY1_ITEMS["item-alpha-lite"],
    location: DAY1_LOCATIONS["loc-316-01-B-03"], // CD: 29
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const day1Scenario: SimulationScenario = {
  moduleId: "day1-equipment-check-digit",
  title: "DAY 1: Equipment Familiarity, Cart Prep, & 4-Beat Check-Digit Protocol",
  description:
    "Foundational motor-discipline drill: Master the 4-Beat cycle (Location Check Digit -> Item UPC -> Qty -> Tote) with zero synthetic confirmation steps. Includes the Reverse-Contrast Packaging test.",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.BEGINNER,
  estimatedMinutes: 6,
  zone: Zone.Z1,
  pickCount: 10,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "d1-err-001",
      injectAtPickIndex: 2,
      errorType: ScanResult.WRONG_LOCATION,
      description: "Mis-read shelf check digit — requires location verification",
      expectedResolution: [
        WorkflowStep.EX_INCORRECT_LOCATION,
        WorkflowStep.EX_PRESS_CTRL_W,
        WorkflowStep.PK_VERIFY_LOCATION,
      ],
      sopReference: "BBWD-WI-030 §6.4",
    },
    {
      scenarioId: "d1-err-002",
      injectAtPickIndex: 8,
      errorType: ScanResult.WRONG_ITEM,
      isLastItemAtLocation: true,
      description:
        "Reverse-contrast distractor package scanned — requires verification against pick face",
      expectedResolution: [
        WorkflowStep.EX_INVALID_ITEM_LAST,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.1",
    },
  ],
  passCriteria: {
    minScore: 85,
    maxErrors: 1,
  },
  scoringWeights: {
    accuracy: 0.7, // Higher accuracy weight for Day 1 check-digit discipline
    speed: 0.3,
  },
  targetPicksPerHour: 120, // Baseline Day 1 throughput target
  version: "2.0.0",
  lastUpdated: "2026-09-02",
}

export const DAY1_EQUIPMENT_CHECK_DIGIT = {
  scenario: day1Scenario,
  pickQueue: day1PickQueue,
  cart: day1Cart,
}

