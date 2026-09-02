/**
 * seedData.ts — Simulation seed data for WarehousePro
 *
 * All test and simulation data lives here. Never hardcode warehouse data in
 * tests or components — import from this file exclusively.
 *
 * Per CLAUDE.md §Seed Data
 *
 * ⚠ SKUs and UPCs are representative placeholders.
 *    Replace with real GEODIS product catalog once data access is confirmed.
 * ⚠ Barcode formats confirmed against SOP screenshots — verify exact values
 *    with GEODIS IT before production use.
 */

import {
  Zone,
  ContentType,
  DifficultyLevel,
  ScanResult,
  WorkflowStep,
  type WarehouseLocation,
  type WarehouseItem,
  type PickCart,
  type PickTask,
  type SimulationScenario,
  type Tote,
  type ToteSlot,
} from "@/types/domain"
import { DAY1_EQUIPMENT_CHECK_DIGIT } from "@/data/scenarios/day1EquipmentCheckDigit"
import { DAY2_SERPENTINE_ROUTING } from "@/data/scenarios/day2SerpentineRouting"

// ─────────────────────────────────────────────────────────────────────────────
// SEED LOCATIONS — 30 across Z1/Z2/Z3/Z4/HAZ
// Per CLAUDE.md §Seed Data: 30 locations
// Format: AAA-NNN-NN (aisle-bay-level), e.g. "316-001-A1"
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_LOCATIONS: Readonly<Record<string, WarehouseLocation>> = {
  // ── Zone 1 (10 locations) ─────────────────────────────────────────────
  "loc-z1-001": { locationId: "loc-z1-001", zone: Zone.Z1, aisle: "316", bay: "001", level: "A1", displayLabel: "316-001-A1" },
  "loc-z1-002": { locationId: "loc-z1-002", zone: Zone.Z1, aisle: "316", bay: "001", level: "A2", displayLabel: "316-001-A2" },
  "loc-z1-003": { locationId: "loc-z1-003", zone: Zone.Z1, aisle: "316", bay: "001", level: "B1", displayLabel: "316-001-B1" },
  "loc-z1-004": { locationId: "loc-z1-004", zone: Zone.Z1, aisle: "316", bay: "002", level: "A1", displayLabel: "316-002-A1" },
  "loc-z1-005": { locationId: "loc-z1-005", zone: Zone.Z1, aisle: "316", bay: "002", level: "A2", displayLabel: "316-002-A2" },
  "loc-z1-006": { locationId: "loc-z1-006", zone: Zone.Z1, aisle: "316", bay: "002", level: "B1", displayLabel: "316-002-B1" },
  "loc-z1-007": { locationId: "loc-z1-007", zone: Zone.Z1, aisle: "316", bay: "003", level: "A1", displayLabel: "316-003-A1" },
  "loc-z1-008": { locationId: "loc-z1-008", zone: Zone.Z1, aisle: "316", bay: "003", level: "A2", displayLabel: "316-003-A2" },
  "loc-z1-009": { locationId: "loc-z1-009", zone: Zone.Z1, aisle: "316", bay: "004", level: "A1", displayLabel: "316-004-A1" },
  "loc-z1-010": { locationId: "loc-z1-010", zone: Zone.Z1, aisle: "316", bay: "004", level: "A2", displayLabel: "316-004-A2" },

  // ── Zone 2 (7 locations) ──────────────────────────────────────────────
  "loc-z2-001": { locationId: "loc-z2-001", zone: Zone.Z2, aisle: "412", bay: "001", level: "A1", displayLabel: "412-001-A1" },
  "loc-z2-002": { locationId: "loc-z2-002", zone: Zone.Z2, aisle: "412", bay: "001", level: "A2", displayLabel: "412-001-A2" },
  "loc-z2-003": { locationId: "loc-z2-003", zone: Zone.Z2, aisle: "412", bay: "001", level: "B1", displayLabel: "412-001-B1" },
  "loc-z2-004": { locationId: "loc-z2-004", zone: Zone.Z2, aisle: "412", bay: "002", level: "A1", displayLabel: "412-002-A1" },
  "loc-z2-005": { locationId: "loc-z2-005", zone: Zone.Z2, aisle: "412", bay: "002", level: "A2", displayLabel: "412-002-A2" },
  "loc-z2-006": { locationId: "loc-z2-006", zone: Zone.Z2, aisle: "412", bay: "003", level: "A1", displayLabel: "412-003-A1" },
  "loc-z2-007": { locationId: "loc-z2-007", zone: Zone.Z2, aisle: "412", bay: "003", level: "B1", displayLabel: "412-003-B1" },

  // ── Zone 3 (7 locations) ──────────────────────────────────────────────
  "loc-z3-001": { locationId: "loc-z3-001", zone: Zone.Z3, aisle: "508", bay: "001", level: "A1", displayLabel: "508-001-A1" },
  "loc-z3-002": { locationId: "loc-z3-002", zone: Zone.Z3, aisle: "508", bay: "001", level: "A2", displayLabel: "508-001-A2" },
  "loc-z3-003": { locationId: "loc-z3-003", zone: Zone.Z3, aisle: "508", bay: "002", level: "A1", displayLabel: "508-002-A1" },
  "loc-z3-004": { locationId: "loc-z3-004", zone: Zone.Z3, aisle: "508", bay: "002", level: "A2", displayLabel: "508-002-A2" },
  "loc-z3-005": { locationId: "loc-z3-005", zone: Zone.Z3, aisle: "508", bay: "003", level: "A1", displayLabel: "508-003-A1" },
  "loc-z3-006": { locationId: "loc-z3-006", zone: Zone.Z3, aisle: "508", bay: "003", level: "B1", displayLabel: "508-003-B1" },
  "loc-z3-007": { locationId: "loc-z3-007", zone: Zone.Z3, aisle: "508", bay: "004", level: "A1", displayLabel: "508-004-A1" },

  // ── Zone 4 (3 locations) ──────────────────────────────────────────────
  "loc-z4-001": { locationId: "loc-z4-001", zone: Zone.Z4, aisle: "612", bay: "001", level: "A1", displayLabel: "612-001-A1" },
  "loc-z4-002": { locationId: "loc-z4-002", zone: Zone.Z4, aisle: "612", bay: "001", level: "A2", displayLabel: "612-001-A2" },
  "loc-z4-003": { locationId: "loc-z4-003", zone: Zone.Z4, aisle: "612", bay: "002", level: "A1", displayLabel: "612-002-A1" },

  // ── HAZ (3 locations) ────────────────────────────────────────────────
  "loc-haz-001": { locationId: "loc-haz-001", zone: Zone.HAZ, aisle: "900", bay: "001", level: "A1", displayLabel: "900-001-A1" },
  "loc-haz-002": { locationId: "loc-haz-002", zone: Zone.HAZ, aisle: "900", bay: "001", level: "A2", displayLabel: "900-001-A2" },
  "loc-haz-003": { locationId: "loc-haz-003", zone: Zone.HAZ, aisle: "900", bay: "002", level: "A1", displayLabel: "900-002-A1" },
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED ITEMS — 14 items (10 standard + 3 multi-qty + 1 HAZ)
// Per CLAUDE.md §Seed Data: 14 items
// UPC format: 12-digit UPC-A (representative placeholders)
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_ITEMS: Readonly<Record<string, WarehouseItem>> = {
  "item-001": { itemId: "item-001", sku: "024505572", upcBarcode: "024505572001", description: "Widget Alpha", unitOfMeasure: "Unit", lastFourDigits: "2001" },
  "item-002": { itemId: "item-002", sku: "031200000", upcBarcode: "031200000027", description: "Bracket Steel 4in", unitOfMeasure: "Unit", lastFourDigits: "0027" },
  "item-003": { itemId: "item-003", sku: "012345678", upcBarcode: "012345678905", description: "Foam Packing Block", unitOfMeasure: "Unit", lastFourDigits: "8905" },
  "item-004": { itemId: "item-004", sku: "071050030", upcBarcode: "071050030052", description: "Tape Roll 2in", unitOfMeasure: "Unit", lastFourDigits: "0052" },
  "item-005": { itemId: "item-005", sku: "041333040", upcBarcode: "041333040109", description: "Cable Tie Bag", unitOfMeasure: "Bag", lastFourDigits: "0109" },
  "item-006": { itemId: "item-006", sku: "052000002", upcBarcode: "052000002107", description: "Label Sheet A4", unitOfMeasure: "Sheet", lastFourDigits: "2107" },
  "item-007": { itemId: "item-007", sku: "063200012", upcBarcode: "063200012349", description: "Pallet Wrap Roll", unitOfMeasure: "Roll", lastFourDigits: "2349" },
  "item-008": { itemId: "item-008", sku: "074300010", upcBarcode: "074300010041", description: "Corner Protector", unitOfMeasure: "Unit", lastFourDigits: "0041" },
  "item-009": { itemId: "item-009", sku: "085000009", upcBarcode: "085000009008", description: "Bubble Wrap Sheet", unitOfMeasure: "Sheet", lastFourDigits: "9008" },
  "item-010": { itemId: "item-010", sku: "096100025", upcBarcode: "096100025003", description: "Cardboard Insert", unitOfMeasure: "Unit", lastFourDigits: "5003" },
  // Multi-quantity items
  "item-011": { itemId: "item-011", sku: "107200030", upcBarcode: "107200030019", description: "Bolt Set M8 (Qty 10)", unitOfMeasure: "Case", lastFourDigits: "0019" },
  "item-012": { itemId: "item-012", sku: "118300015", upcBarcode: "118300015012", description: "Washer Pack (Qty 25)", unitOfMeasure: "Pack", lastFourDigits: "5012" },
  "item-013": { itemId: "item-013", sku: "129400020", upcBarcode: "129400020006", description: "Nut Set M8 (Qty 20)", unitOfMeasure: "Pack", lastFourDigits: "0006" },
  // HAZ item
  "item-014": { itemId: "item-014", sku: "140500035", upcBarcode: "140500035034", description: "Solvent Cleaner 500ml", unitOfMeasure: "Bottle", lastFourDigits: "5034" },
}

// ─────────────────────────────────────────────────────────────────────────────
// TOTE BARCODE HELPERS
// Format: T + 14 digits, e.g. T00000000011692
// Per CLAUDE.md §Seed Data barcode formats
// ─────────────────────────────────────────────────────────────────────────────

/** Generate a T+14-digit tote barcode from a numeric base. */
function toteBc(n: number): string {
  return `T${String(n).padStart(14, "0")}`
}

/**
 * Build a contiguous tote-slot plan for a pick queue.
 *
 * Per BBWD-WI-030 §5.2.11 the picker repeats picks into the SAME tote until it
 * is full and "End Of Tote" is displayed, then starts the next tote — a tote is
 * never returned to once it has been closed and railed to the conveyor.
 * Slots therefore come out as contiguous runs (1,1,1,2,2,3,3…), never
 * interleaved, and every tote receives more than one pick.
 *
 * @param pickCount Total picks in the round.
 * @param toteCount How many totes of the cart the round consumes (max 9).
 */
function buildSlotPlan(pickCount: number, toteCount: number): ToteSlot[] {
  const plan: ToteSlot[] = []
  const base = Math.floor(pickCount / toteCount)
  let remainder = pickCount % toteCount

  for (let slot = 1; slot <= toteCount; slot++) {
    const count = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
    for (let k = 0; k < count; k++) plan.push(slot as ToteSlot)
  }
  return plan
}

/** Build 9 Tote objects for a cart, using sequential barcodes from baseNum. */
function buildNineTotes(cartId: string, baseNum: number): Tote[] {
  return Array.from({ length: 9 }, (_, i) => ({
    toteId: `${cartId}-s${i + 1}`,
    barcode: toteBc(baseNum + i),
    slot: (i + 1) as ToteSlot,
    pickedItems: [],
    isComplete: false,
    placedOnConveyor: false,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED CARTS — 7 templates
// Per CLAUDE.md §Seed Data: 7 cart templates
// Cart barcode format: C + 9 digits, e.g. C000000083
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_CARTS: Readonly<Record<string, PickCart>> = {
  "cart-z1-001": {
    cartId: "cart-z1-001",
    cartBarcode: "C000000083",
    totes: buildNineTotes("cart-z1-001", 11692), // T00000000011692–T00000000011700
    zone: Zone.Z1,
    taskGroup: Zone.Z1,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-z1-002": {
    cartId: "cart-z1-002",
    cartBarcode: "C000000084",
    totes: buildNineTotes("cart-z1-002", 11701), // T00000000011701–T00000000011709
    zone: Zone.Z1,
    taskGroup: Zone.Z1,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-z2-001": {
    cartId: "cart-z2-001",
    cartBarcode: "C000000085",
    totes: buildNineTotes("cart-z2-001", 11710), // T00000000011710–T00000000011718
    zone: Zone.Z2,
    taskGroup: Zone.Z2,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-z3-001": {
    cartId: "cart-z3-001",
    cartBarcode: "C000000086",
    totes: buildNineTotes("cart-z3-001", 11719), // T00000000011719–T00000000011727
    zone: Zone.Z3,
    taskGroup: Zone.Z3,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-z4-001": {
    cartId: "cart-z4-001",
    cartBarcode: "C000000087",
    totes: buildNineTotes("cart-z4-001", 11728), // T00000000011728–T00000000011736
    zone: Zone.Z4,
    taskGroup: Zone.Z4,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-haz-001": {
    cartId: "cart-haz-001",
    cartBarcode: "C000000088",
    totes: buildNineTotes("cart-haz-001", 11737), // T00000000011737–T00000000011745
    zone: Zone.HAZ,
    taskGroup: Zone.HAZ,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
  "cart-fex-001": {
    cartId: "cart-fex-001",
    cartBarcode: "C000000089",
    totes: buildNineTotes("cart-fex-001", 11746), // T00000000011746–T00000000011754
    zone: Zone.FEX,
    taskGroup: Zone.FEX,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO BUNDLES
// Each bundle pairs a SimulationScenario with its pick queue and cart.
// ─────────────────────────────────────────────────────────────────────────────

/** A complete, self-contained scenario for test and simulation use. */
export interface ScenarioBundle {
  scenario: SimulationScenario
  pickQueue: PickTask[]
  cart: PickCart
}

// ── Z1_20_PICKS ─────────────────────────────────────────────────────────────
// 20 picks from Zone 1. Error injection: WRONG_ITEM at pick 7 (last at location),
// ITEM_NOT_FOUND at pick 15.
// Picks distributed 9 totes: totes 1-2 get 3 picks each, totes 3-9 get 2 picks each.
// ─────────────────────────────────────────────────────────────────────────────

const z1Cart = SEED_CARTS["cart-z1-001"]
const locs = SEED_LOCATIONS
const items = SEED_ITEMS

function makeZ1Pick(
  idx: number,
  toteSlot: ToteSlot,
  locationKey: keyof typeof SEED_LOCATIONS,
  itemKey: keyof typeof SEED_ITEMS,
  qty = 1
): PickTask {
  const cart = z1Cart
  return {
    pickTaskId: `z1-pick-${String(idx).padStart(3, "0")}`,
    orderNumber: `ORD-Z1-${String(Math.floor(idx / 2) + 1).padStart(4, "0")}`,
    item: items[itemKey],
    location: locs[locationKey],
    quantityRequired: qty,
    targetToteId: cart.totes[toteSlot - 1].toteId,
    targetSlot: toteSlot,
    isExpress: false,
  }
}

const z1PickQueue: PickTask[] = [
  // Tote 1 — 3 picks (picks 0, 1, 2)
  makeZ1Pick(0, 1, "loc-z1-001", "item-001"),
  makeZ1Pick(1, 1, "loc-z1-002", "item-002"),
  makeZ1Pick(2, 1, "loc-z1-003", "item-003"),
  // Tote 2 — 3 picks (picks 3, 4, 5)
  makeZ1Pick(3, 2, "loc-z1-004", "item-004"),
  makeZ1Pick(4, 2, "loc-z1-005", "item-005"),
  makeZ1Pick(5, 2, "loc-z1-006", "item-006"),
  // Tote 3 — 2 picks (picks 6, 7) ← error injection at pick 7 (last for tote 3)
  makeZ1Pick(6, 3, "loc-z1-007", "item-007"),
  makeZ1Pick(7, 3, "loc-z1-008", "item-008"), // WRONG_ITEM injected here
  // Tote 4 — 2 picks (picks 8, 9)
  makeZ1Pick(8, 4, "loc-z1-009", "item-001"),
  makeZ1Pick(9, 4, "loc-z1-010", "item-002"),
  // Tote 5 — 2 picks (picks 10, 11)
  makeZ1Pick(10, 5, "loc-z1-001", "item-003"),
  makeZ1Pick(11, 5, "loc-z1-002", "item-004"),
  // Tote 6 — 2 picks (picks 12, 13)
  makeZ1Pick(12, 6, "loc-z1-003", "item-005"),
  makeZ1Pick(13, 6, "loc-z1-004", "item-006"),
  // Tote 7 — 2 picks (picks 14, 15) ← error injection at pick 15 (last for tote 7)
  makeZ1Pick(14, 7, "loc-z1-005", "item-007"),
  makeZ1Pick(15, 7, "loc-z1-006", "item-008"), // ITEM_NOT_FOUND injected here
  // Tote 8 — 2 picks (picks 16, 17)
  makeZ1Pick(16, 8, "loc-z1-007", "item-001"),
  makeZ1Pick(17, 8, "loc-z1-008", "item-002"),
  // Tote 9 — 2 picks (picks 18, 19)
  makeZ1Pick(18, 9, "loc-z1-009", "item-003"),
  makeZ1Pick(19, 9, "loc-z1-010", "item-004"),
]

const z1Scenario20: SimulationScenario = {
  moduleId: "sim-z1-20picks",
  title: "Zone 1 — 20 Pick Simulation",
  description: "Standard Z1 pick round with injected error scenarios",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.INTERMEDIATE,
  estimatedMinutes: 15,
  zone: Zone.Z1,
  pickCount: 20,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "z1-err-001",
      injectAtPickIndex: 7,
      errorType: ScanResult.WRONG_ITEM,
      isLastItemAtLocation: true, // last item at loc-z1-008
      description: "Wrong item at last location on tote 3 — tests EX_INVALID_ITEM_LAST path",
      expectedResolution: [
        WorkflowStep.EX_INVALID_ITEM_LAST,
        WorkflowStep.EX_NOTIFY_LEAD,
        WorkflowStep.EX_PRESS_CTRL_K,
        WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR,
        WorkflowStep.EX_ITEM_TO_AMNESTY_BIN,
      ],
      sopReference: "BBWD-WI-030 §6.5.1",
    },
    {
      scenarioId: "z1-err-002",
      injectAtPickIndex: 15,
      errorType: ScanResult.ITEM_NOT_FOUND,
      description: "Short inventory at tote 7 — tests EX_SHORT_INVENTORY path",
      expectedResolution: [
        WorkflowStep.EX_SHORT_INVENTORY,
        WorkflowStep.EX_NOTIFY_LEAD,
        WorkflowStep.EX_PRESS_CTRL_K,
      ],
      sopReference: "BBWD-WI-030 §6.6",
    },
  ],
  passCriteria: { minScore: 75, maxErrors: 5 },
  scoringWeights: { accuracy: 0.6, speed: 0.4 },
  // Per CLAUDE.md: TBD — confirm actual picks-per-hour benchmark with GEODIS operations
  targetPicksPerHour: 150,
  version: "1.0.0",
  lastUpdated: "2026-03-03",
}

// ── Z1_10_PICKS ──────────────────────────────────────────────────────────────

const z1Cart2 = SEED_CARTS["cart-z1-002"]

// 10 picks across 3 totes: slot 1 ×4, slot 2 ×3, slot 3 ×3.
const z1PickQueue10: PickTask[] = buildSlotPlan(10, 3).map((slot, i) => ({
  pickTaskId: `z1-10-pick-${String(i).padStart(3, "0")}`,
  orderNumber: `ORD-Z1B-${String(i + 1).padStart(4, "0")}`,
  item: items[`item-${String((i % 10) + 1).padStart(3, "0")}` as keyof typeof SEED_ITEMS],
  location: locs[`loc-z1-${String((i % 10) + 1).padStart(3, "0")}` as keyof typeof SEED_LOCATIONS],
  quantityRequired: 1,
  targetToteId: z1Cart2.totes[slot - 1].toteId,
  targetSlot: slot,
  isExpress: false,
}))

const z1Scenario10: SimulationScenario = {
  moduleId: "sim-z1-10picks",
  title: "Zone 1 — 10 Pick Simulation",
  description: "Beginner round: 10 picks filling 3 totes, with guided exceptions",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.BEGINNER,
  estimatedMinutes: 8,
  zone: Zone.Z1,
  pickCount: 10,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    {
      scenarioId: "z1b-err-001",
      injectAtPickIndex: 3,
      errorType: ScanResult.WRONG_ITEM,
      isLastItemAtLocation: true,
      description: "Invalid item, last at Pick Front",
      expectedResolution: [WorkflowStep.EX_INVALID_ITEM_LAST, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K, WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR, WorkflowStep.EX_ITEM_TO_AMNESTY_BIN],
      sopReference: "BBWD-WI-030 §6.5.1",
    },
    {
      scenarioId: "z1b-err-002",
      injectAtPickIndex: 7,
      errorType: ScanResult.ITEM_NOT_FOUND,
      description: "Short Inventory at assigned Pick Front",
      expectedResolution: [WorkflowStep.EX_SHORT_INVENTORY, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K],
      sopReference: "BBWD-WI-030 §6.6",
    },
  ],
  passCriteria: { minScore: 70, maxErrors: 3 },
  scoringWeights: { accuracy: 0.6, speed: 0.4 },
  targetPicksPerHour: 150,
  version: "1.0.0",
  lastUpdated: "2026-03-03",
}

// ── Z2_20_PICKS ───────────────────────────────────────────────────────────────

const z2Cart = SEED_CARTS["cart-z2-001"]

// 20 picks across 7 totes — the old `% 9` wrapped past slot 9 and sent the
// final picks back into slot 1, a tote already closed and railed to the conveyor.
const z2SlotPlan = buildSlotPlan(20, 7)

const z2PickQueue: PickTask[] = Array.from({ length: 20 }, (_, i) => {
  const slot = z2SlotPlan[i]
  const locKey = `loc-z2-${String((i % 7) + 1).padStart(3, "0")}` as keyof typeof SEED_LOCATIONS
  const itemKey = `item-${String((i % 10) + 1).padStart(3, "0")}` as keyof typeof SEED_ITEMS
  return {
    pickTaskId: `z2-pick-${String(i).padStart(3, "0")}`,
    orderNumber: `ORD-Z2-${String(Math.floor(i / 2) + 1).padStart(4, "0")}`,
    item: items[itemKey],
    location: locs[locKey],
    quantityRequired: 1,
    targetToteId: z2Cart.totes[slot - 1].toteId,
    targetSlot: slot,
    isExpress: false,
  }
})

const z2Scenario20: SimulationScenario = {
  moduleId: "sim-z2-20picks",
  title: "Zone 2 — 20 Pick Simulation",
  description: "Z2 standard pick round",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.INTERMEDIATE,
  estimatedMinutes: 15,
  zone: Zone.Z2,
  pickCount: 20,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    { scenarioId: "z2-err-001", injectAtPickIndex: 5, errorType: ScanResult.WRONG_ITEM, isLastItemAtLocation: true, description: "Invalid item, last at Pick Front", expectedResolution: [WorkflowStep.EX_INVALID_ITEM_LAST, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K, WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR, WorkflowStep.EX_ITEM_TO_AMNESTY_BIN], sopReference: "BBWD-WI-030 §6.5.1" },
    { scenarioId: "z2-err-002", injectAtPickIndex: 14, errorType: ScanResult.ITEM_NOT_FOUND, description: "Short Inventory", expectedResolution: [WorkflowStep.EX_SHORT_INVENTORY, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K], sopReference: "BBWD-WI-030 §6.6" },
  ],
  passCriteria: { minScore: 75, maxErrors: 5 },
  scoringWeights: { accuracy: 0.6, speed: 0.4 },
  targetPicksPerHour: 150,
  version: "1.0.0",
  lastUpdated: "2026-03-03",
}

// ── HAZ_10_PICKS ─────────────────────────────────────────────────────────────

const hazCart = SEED_CARTS["cart-haz-001"]

// 10 picks across 5 totes.
const hazSlotPlan = buildSlotPlan(10, 5)

const hazPickQueue: PickTask[] = Array.from({ length: 10 }, (_, i) => {
  const slot = hazSlotPlan[i]
  const locKey = `loc-haz-${String((i % 3) + 1).padStart(3, "0")}` as keyof typeof SEED_LOCATIONS
  return {
    pickTaskId: `haz-pick-${String(i).padStart(3, "0")}`,
    orderNumber: `ORD-HAZ-${String(i + 1).padStart(4, "0")}`,
    item: items["item-014"], // HAZ item
    location: locs[locKey],
    quantityRequired: 1,
    targetToteId: hazCart.totes[slot - 1].toteId,
    targetSlot: slot,
    isExpress: false,
  }
})

const hazScenario10: SimulationScenario = {
  moduleId: "sim-haz-10picks",
  title: "HAZ — 10 Pick Simulation",
  description: "Hazardous materials pick round",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.ADVANCED,
  estimatedMinutes: 12,
  zone: Zone.HAZ,
  pickCount: 10,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    { scenarioId: "haz-err-001", injectAtPickIndex: 4, errorType: ScanResult.ITEM_DAMAGED, description: "Damaged HAZ item", expectedResolution: [WorkflowStep.EX_DAMAGED_ITEM, WorkflowStep.EX_ITEM_TO_AMNESTY_BIN], sopReference: "BBWD-WI-030 §6.8" },
    { scenarioId: "haz-err-002", injectAtPickIndex: 8, errorType: ScanResult.WRONG_ITEM, isLastItemAtLocation: true, description: "Invalid HAZ item, last at Pick Front", expectedResolution: [WorkflowStep.EX_INVALID_ITEM_LAST, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K, WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR, WorkflowStep.EX_ITEM_TO_AMNESTY_BIN], sopReference: "BBWD-WI-030 §6.5.1" },
  ],
  passCriteria: { minScore: 80, maxErrors: 2 },
  scoringWeights: { accuracy: 0.7, speed: 0.3 },
  targetPicksPerHour: 100,
  version: "1.0.0",
  lastUpdated: "2026-03-03",
}

// ── FEX_15_PICKS ─────────────────────────────────────────────────────────────

const fexCart = SEED_CARTS["cart-fex-001"]

// 15 picks across 5 totes — the old plan left slot 8 with a single pick, which
// closed that tote immediately after one item.
const fexSlotPlan = buildSlotPlan(15, 5)

const fexPickQueue: PickTask[] = Array.from({ length: 15 }, (_, i) => {
  const slot = fexSlotPlan[i]
  const locKey = `loc-z1-${String((i % 10) + 1).padStart(3, "0")}` as keyof typeof SEED_LOCATIONS
  const itemKey = `item-${String((i % 10) + 1).padStart(3, "0")}` as keyof typeof SEED_ITEMS
  return {
    pickTaskId: `fex-pick-${String(i).padStart(3, "0")}`,
    orderNumber: `ORD-FEX-${String(i + 1).padStart(4, "0")}`,
    item: items[itemKey],
    location: locs[locKey],
    quantityRequired: 1,
    targetToteId: fexCart.totes[slot - 1].toteId,
    targetSlot: slot,
    isExpress: true,
  }
})

const fexScenario15: SimulationScenario = {
  moduleId: "sim-fex-15picks",
  title: "FEX Express — 15 Pick Simulation",
  description: "Express order (FEX) pick round — priority handling",
  contentType: ContentType.SIMULATION,
  difficulty: DifficultyLevel.INTERMEDIATE,
  estimatedMinutes: 10,
  zone: Zone.FEX,
  pickCount: 15,
  toteCount: 9,
  steps: [],
  errorScenarios: [
    { scenarioId: "fex-err-001", injectAtPickIndex: 4, errorType: ScanResult.WRONG_ITEM, isLastItemAtLocation: true, description: "Invalid Express item, last at Pick Front", expectedResolution: [WorkflowStep.EX_INVALID_ITEM_LAST, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K, WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR, WorkflowStep.EX_ITEM_TO_AMNESTY_BIN], sopReference: "BBWD-WI-030 §6.5.1" },
    { scenarioId: "fex-err-002", injectAtPickIndex: 11, errorType: ScanResult.ITEM_NOT_FOUND, description: "Short Inventory on Express Pick", expectedResolution: [WorkflowStep.EX_SHORT_INVENTORY, WorkflowStep.EX_NOTIFY_LEAD, WorkflowStep.EX_PRESS_CTRL_K], sopReference: "BBWD-WI-030 §6.6" },
  ],
  passCriteria: { minScore: 80, maxErrors: 3 },
  scoringWeights: { accuracy: 0.6, speed: 0.4 },
  targetPicksPerHour: 180, // Express orders have higher throughput target
  version: "1.0.0",
  lastUpdated: "2026-03-03",
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO_DATA — the canonical export
// Per CLAUDE.md §Seed Data: 5 pre-built scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const SCENARIO_DATA: Readonly<Record<string, ScenarioBundle>> = {
  Z1_20_PICKS: {
    scenario: z1Scenario20,
    pickQueue: z1PickQueue,
    cart: { ...SEED_CARTS["cart-z1-001"], isBuilt: true },
  },
  Z1_10_PICKS: {
    scenario: z1Scenario10,
    pickQueue: z1PickQueue10,
    cart: { ...SEED_CARTS["cart-z1-002"], isBuilt: true },
  },
  Z2_20_PICKS: {
    scenario: z2Scenario20,
    pickQueue: z2PickQueue,
    cart: { ...SEED_CARTS["cart-z2-001"], isBuilt: true },
  },
  HAZ_10_PICKS: {
    scenario: hazScenario10,
    pickQueue: hazPickQueue,
    cart: { ...SEED_CARTS["cart-haz-001"], isBuilt: true },
  },
  FEX_15_PICKS: {
    scenario: fexScenario15,
    pickQueue: fexPickQueue,
    cart: { ...SEED_CARTS["cart-fex-001"], isBuilt: true },
  },
  DAY1_EQUIPMENT_CHECK_DIGIT,
  DAY2_SERPENTINE_ROUTING,
}

