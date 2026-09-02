/**
 * day2SerpentineRouting.ts
 *
 * DAY 2: Serpentine Routing & Multi-Bay Traversal
 *
 * Strategic Objective:
 * Trains path efficiency and spatial discipline. Cures "yo-yo backtracking"
 * by enforcing monotonic S-curve aisle traversal across 4 consecutive bays
 * (Aisle 316, Bays 01 through 04) and Level A (Bottom) -> Level B (Golden Zone)
 * vertical sequencing during multi-tote cluster wave picking.
 *
 * Structure:
 * - Phase A: Linear 2-Bay Traversal (4 picks, Totes 1 & 2)
 * - Phase B: Full 4-Bay Serpentine Wave (8 picks across 4 interleaved totes)
 * - Phase C: The Backtrack Trap (2 picks in Bay 04 with familiar Bay 01 artwork)
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
// AISLE 316 SPATIAL LOCATIONS (BAYS 01 TO 04, LEVELS A & B)
// ─────────────────────────────────────────────────────────────────────────────

export const DAY2_LOCATIONS: Record<string, SpatialLocation> = {
  // ── Bay 01 (y = 10m) ──────────────────────────────────────────────────────
  "loc-316-01-A-01": {
    locationId: "loc-316-01-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "A",
    displayLabel: "316-01-A-01",
    checkDigit: "18",
    barcode: "LOC-316-01-A-01",
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 0.2 },
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
    spatial: { x: 20, y: 10, aisleSide: "LEFT", levelHeight: 1.2 },
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
    spatial: { x: 80, y: 10, aisleSide: "RIGHT", levelHeight: 0.2 },
  },
  "loc-316-01-B-02": {
    locationId: "loc-316-01-B-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "01",
    level: "B",
    displayLabel: "316-01-B-02",
    checkDigit: "52",
    barcode: "LOC-316-01-B-02",
    spatial: { x: 80, y: 10, aisleSide: "RIGHT", levelHeight: 1.2 },
  },

  // ── Bay 02 (y = 30m) ──────────────────────────────────────────────────────
  "loc-316-02-A-01": {
    locationId: "loc-316-02-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "A",
    displayLabel: "316-02-A-01",
    checkDigit: "64",
    barcode: "LOC-316-02-A-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 0.2 },
  },
  "loc-316-02-B-01": {
    locationId: "loc-316-02-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "B",
    displayLabel: "316-02-B-01",
    checkDigit: "31",
    barcode: "LOC-316-02-B-01",
    spatial: { x: 20, y: 30, aisleSide: "LEFT", levelHeight: 1.2 },
  },
  "loc-316-02-A-02": {
    locationId: "loc-316-02-A-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "A",
    displayLabel: "316-02-A-02",
    checkDigit: "95",
    barcode: "LOC-316-02-A-02",
    spatial: { x: 80, y: 30, aisleSide: "RIGHT", levelHeight: 0.2 },
  },
  "loc-316-02-B-02": {
    locationId: "loc-316-02-B-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "02",
    level: "B",
    displayLabel: "316-02-B-02",
    checkDigit: "12",
    barcode: "LOC-316-02-B-02",
    spatial: { x: 80, y: 30, aisleSide: "RIGHT", levelHeight: 1.2 },
  },

  // ── Bay 03 (y = 50m) ──────────────────────────────────────────────────────
  "loc-316-03-A-01": {
    locationId: "loc-316-03-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "A",
    displayLabel: "316-03-A-01",
    checkDigit: "77",
    barcode: "LOC-316-03-A-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 0.2 },
  },
  "loc-316-03-B-01": {
    locationId: "loc-316-03-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "B",
    displayLabel: "316-03-B-01",
    checkDigit: "43",
    barcode: "LOC-316-03-B-01",
    spatial: { x: 20, y: 50, aisleSide: "LEFT", levelHeight: 1.2 },
  },
  "loc-316-03-A-02": {
    locationId: "loc-316-03-A-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "A",
    displayLabel: "316-03-A-02",
    checkDigit: "28",
    barcode: "LOC-316-03-A-02",
    spatial: { x: 80, y: 50, aisleSide: "RIGHT", levelHeight: 0.2 },
  },
  "loc-316-03-B-02": {
    locationId: "loc-316-03-B-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "03",
    level: "B",
    displayLabel: "316-03-B-02",
    checkDigit: "89",
    barcode: "LOC-316-03-B-02",
    spatial: { x: 80, y: 50, aisleSide: "RIGHT", levelHeight: 1.2 },
  },

  // ── Bay 04 (y = 70m) ──────────────────────────────────────────────────────
  "loc-316-04-A-01": {
    locationId: "loc-316-04-A-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "A",
    displayLabel: "316-04-A-01",
    checkDigit: "36",
    barcode: "LOC-316-04-A-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 0.2 },
  },
  "loc-316-04-B-01": {
    locationId: "loc-316-04-B-01",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "B",
    displayLabel: "316-04-B-01",
    checkDigit: "58",
    barcode: "LOC-316-04-B-01",
    spatial: { x: 20, y: 70, aisleSide: "LEFT", levelHeight: 1.2 },
  },
  "loc-316-04-A-02": {
    locationId: "loc-316-04-A-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "A",
    displayLabel: "316-04-A-02",
    checkDigit: "91",
    barcode: "LOC-316-04-A-02",
    spatial: { x: 80, y: 70, aisleSide: "RIGHT", levelHeight: 0.2 },
  },
  "loc-316-04-B-02": {
    locationId: "loc-316-04-B-02",
    zone: Zone.Z1,
    aisle: "316",
    bay: "04",
    level: "B",
    displayLabel: "316-04-B-02",
    checkDigit: "14",
    barcode: "LOC-316-04-B-02",
    spatial: { x: 80, y: 70, aisleSide: "RIGHT", levelHeight: 1.2 },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WAREHOUSE ITEMS
// ─────────────────────────────────────────────────────────────────────────────

export const DAY2_ITEMS: Record<string, WarehouseItem> = {
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
  // Phase C: Backtrack Trap item (Identical bottle shape to Bay 01 item)
  "item-hydra-clean-refill": {
    itemId: "item-hydra-clean-refill",
    sku: "024505595",
    upcBarcode: "00024505595088",
    description: "Standard Blue Widget 250ml (Refill Pack)",
    unitOfMeasure: "EA",
    lastFourDigits: "5088",
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CART & TOTE SETUP (9-Tote Cart with Totes 1–4 Active for Cluster Wave)
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

export const day2Totes: Tote[] = [
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

export const day2Cart: PickCart = {
  cartId: "cart-day2-001",
  cartBarcode: "CART-02",
  totes: day2Totes,
  zone: Zone.Z1,
  taskGroup: "BBWD",
  roundNumber: 1,
  totalItemsPicked: 0,
  isBuilt: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// PICK QUEUE (14 PICKS TOTAL: 4 LINEAR + 8 SERPENTINE CLUSTER + 2 TRAP)
// ─────────────────────────────────────────────────────────────────────────────

export const day2PickQueue: PickTask[] = [
  // ── Phase A: Linear 2-Bay Traversal (4 Picks) ────────────────────────────
  {
    pickTaskId: "d2-pick-001",
    orderNumber: "ORD-D2-2001",
    item: DAY2_ITEMS["item-widget-blue"],
    location: DAY2_LOCATIONS["loc-316-01-A-01"], // Bay 01 Level A
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-002",
    orderNumber: "ORD-D2-2002",
    item: DAY2_ITEMS["item-widget-green"],
    location: DAY2_LOCATIONS["loc-316-01-B-01"], // Bay 01 Level B
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-003",
    orderNumber: "ORD-D2-2003",
    item: DAY2_ITEMS["item-widget-amber"],
    location: DAY2_LOCATIONS["loc-316-02-A-01"], // Bay 02 Level A
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-004",
    orderNumber: "ORD-D2-2004",
    item: DAY2_ITEMS["item-widget-red"],
    location: DAY2_LOCATIONS["loc-316-02-B-01"], // Bay 02 Level B
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },

  // ── Phase B: Full 4-Bay Serpentine Cluster Wave (8 Picks) ─────────────────
  // Bay 01: Slot A-01 (Tote 1), Slot B-02 (Tote 2)
  {
    pickTaskId: "d2-pick-005",
    orderNumber: "ORD-D2-2005",
    item: DAY2_ITEMS["item-widget-blue"],
    location: DAY2_LOCATIONS["loc-316-01-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-006",
    orderNumber: "ORD-D2-2006",
    item: DAY2_ITEMS["item-widget-green"],
    location: DAY2_LOCATIONS["loc-316-01-B-02"],
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  // Bay 02: Slot A-02 (Tote 3), Slot B-01 (Tote 1)
  {
    pickTaskId: "d2-pick-007",
    orderNumber: "ORD-D2-2007",
    item: DAY2_ITEMS["item-widget-amber"],
    location: DAY2_LOCATIONS["loc-316-02-A-02"],
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-008",
    orderNumber: "ORD-D2-2008",
    item: DAY2_ITEMS["item-widget-red"],
    location: DAY2_LOCATIONS["loc-316-02-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  // Bay 03: Slot A-01 (Tote 4), Slot B-02 (Tote 2)
  {
    pickTaskId: "d2-pick-009",
    orderNumber: "ORD-D2-2009",
    item: DAY2_ITEMS["item-torque-wrench"],
    location: DAY2_LOCATIONS["loc-316-03-A-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-04",
    targetSlot: 4,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-010",
    orderNumber: "ORD-D2-2010",
    item: DAY2_ITEMS["item-widget-green"],
    location: DAY2_LOCATIONS["loc-316-03-B-02"],
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
  // Bay 04: Slot A-02 (Tote 3), Slot B-01 (Tote 4)
  {
    pickTaskId: "d2-pick-011",
    orderNumber: "ORD-D2-2011",
    item: DAY2_ITEMS["item-widget-amber"],
    location: DAY2_LOCATIONS["loc-316-04-A-02"],
    quantityRequired: 1,
    targetToteId: "TOTE-03",
    targetSlot: 3,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-012",
    orderNumber: "ORD-D2-2012",
    item: DAY2_ITEMS["item-widget-red"],
    location: DAY2_LOCATIONS["loc-316-04-B-01"],
    quantityRequired: 1,
    targetToteId: "TOTE-04",
    targetSlot: 4,
    isExpress: false,
  },

  // ── Phase C: The Backtrack Trap (2 Picks in Bay 04) ──────────────────────
  // Item resembles Bay 01 product to test if candidate trusts RF prompt & check digit
  {
    pickTaskId: "d2-pick-013",
    orderNumber: "ORD-D2-2013",
    item: DAY2_ITEMS["item-hydra-clean-refill"],
    location: DAY2_LOCATIONS["loc-316-04-A-01"], // CD: 36
    quantityRequired: 1,
    targetToteId: "TOTE-01",
    targetSlot: 1,
    isExpress: false,
  },
  {
    pickTaskId: "d2-pick-014",
    orderNumber: "ORD-D2-2014",
    item: DAY2_ITEMS["item-torque-wrench"],
    location: DAY2_LOCATIONS["loc-316-04-B-02"], // CD: 14
    quantityRequired: 1,
    targetToteId: "TOTE-02",
    targetSlot: 2,
    isExpress: false,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export const day2Scenario: SimulationScenario & { isClusterWave?: boolean } = {
  moduleId: "day2-serpentine-routing",
  title: "DAY 2: Serpentine Routing & Multi-Bay Traversal",
  description:
    "Spatial discipline drill: Enforces strict monotonic S-Curve traversal across 4 bays (Aisle 316, Bays 01-04) and Level A -> Level B pick sequencing during a 4-tote cluster wave.",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.INTERMEDIATE,
  estimatedMinutes: 8,
  zone: Zone.Z1,
  pickCount: 14,
  toteCount: 9,
  isClusterWave: true,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "d2-err-001",
      injectAtPickIndex: 3,
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
      scenarioId: "d2-err-002",
      injectAtPickIndex: 10,
      errorType: ScanResult.WRONG_ITEM,
      isLastItemAtLocation: true,
      description: "Distractor item scanned — requires verification against pick face",
      expectedResolution: [
        WorkflowStep.EX_INVALID_ITEM_LAST,
        WorkflowStep.EX_NOTIFY_LEAD,
      ],
      sopReference: "BBWD-WI-030 §6.5.1",
    },
  ],
  passCriteria: {
    minScore: 90,
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

export const DAY2_SERPENTINE_ROUTING = {
  scenario: day2Scenario,
  pickQueue: day2PickQueue,
  cart: day2Cart,
}
