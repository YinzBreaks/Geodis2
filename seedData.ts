/**
 * Warehouse Seed Data
 *
 * Realistic test data for simulation sessions derived from the
 * BBWD-VJA-030 and BBWD-WI-030 SOP documents.
 *
 * Barcode formats observed in SOP screenshots:
 *   Cart:  C000000083  (C + 9 digits)
 *   Tote:  T00000000011692  (T + 14 digits)
 *   Item:  UPC-A standard (12 digits)
 *   Location: AAA-NNN-NN  e.g. 316-001-A1
 *
 * TODO: Confirm exact barcode formats with GEODIS WMS/IT team.
 *       Replace placeholder SKUs/UPCs with real product catalog
 *       once data sharing agreement is in place.
 */

import type {
  WarehouseLocation,
  WarehouseItem,
  Tote,
  PickCart,
  PickTask,
} from "./domain";
import { Zone } from "./domain";

// ─── Locations ────────────────────────────────────────────────────────────────

export const WAREHOUSE_LOCATIONS: WarehouseLocation[] = [
  // Zone 1
  { locationId: "316-001-A1", zone: Zone.Z1, aisle: "316", bay: "001", level: "A", displayLabel: "316-001-A1" },
  { locationId: "316-001-B2", zone: Zone.Z1, aisle: "316", bay: "001", level: "B", displayLabel: "316-001-B2" },
  { locationId: "316-002-A1", zone: Zone.Z1, aisle: "316", bay: "002", level: "A", displayLabel: "316-002-A1" },
  { locationId: "316-002-C3", zone: Zone.Z1, aisle: "316", bay: "002", level: "C", displayLabel: "316-002-C3" },
  { locationId: "317-001-A1", zone: Zone.Z1, aisle: "317", bay: "001", level: "A", displayLabel: "317-001-A1" },
  { locationId: "317-001-B1", zone: Zone.Z1, aisle: "317", bay: "001", level: "B", displayLabel: "317-001-B1" },
  { locationId: "317-002-A2", zone: Zone.Z1, aisle: "317", bay: "002", level: "A", displayLabel: "317-002-A2" },
  { locationId: "317-003-B1", zone: Zone.Z1, aisle: "317", bay: "003", level: "B", displayLabel: "317-003-B1" },
  { locationId: "318-001-A1", zone: Zone.Z1, aisle: "318", bay: "001", level: "A", displayLabel: "318-001-A1" },
  { locationId: "318-002-A1", zone: Zone.Z1, aisle: "318", bay: "002", level: "A", displayLabel: "318-002-A1" },

  // Zone 2
  { locationId: "401-001-A1", zone: Zone.Z2, aisle: "401", bay: "001", level: "A", displayLabel: "401-001-A1" },
  { locationId: "401-001-B2", zone: Zone.Z2, aisle: "401", bay: "001", level: "B", displayLabel: "401-001-B2" },
  { locationId: "401-002-A1", zone: Zone.Z2, aisle: "401", bay: "002", level: "A", displayLabel: "401-002-A1" },
  { locationId: "402-001-A1", zone: Zone.Z2, aisle: "402", bay: "001", level: "A", displayLabel: "402-001-A1" },
  { locationId: "402-002-B1", zone: Zone.Z2, aisle: "402", bay: "002", level: "B", displayLabel: "402-002-B1" },
  { locationId: "402-003-A1", zone: Zone.Z2, aisle: "402", bay: "003", level: "A", displayLabel: "402-003-A1" },
  { locationId: "403-001-A1", zone: Zone.Z2, aisle: "403", bay: "001", level: "A", displayLabel: "403-001-A1" },
  { locationId: "403-002-A2", zone: Zone.Z2, aisle: "403", bay: "002", level: "A", displayLabel: "403-002-A2" },

  // Zone 3
  { locationId: "501-001-A1", zone: Zone.Z3, aisle: "501", bay: "001", level: "A", displayLabel: "501-001-A1" },
  { locationId: "501-001-B1", zone: Zone.Z3, aisle: "501", bay: "001", level: "B", displayLabel: "501-001-B1" },
  { locationId: "501-002-A1", zone: Zone.Z3, aisle: "501", bay: "002", level: "A", displayLabel: "501-002-A1" },
  { locationId: "502-001-A1", zone: Zone.Z3, aisle: "502", bay: "001", level: "A", displayLabel: "502-001-A1" },
  { locationId: "502-002-B2", zone: Zone.Z3, aisle: "502", bay: "002", level: "B", displayLabel: "502-002-B2" },

  // Zone 4
  { locationId: "601-001-A1", zone: Zone.Z4, aisle: "601", bay: "001", level: "A", displayLabel: "601-001-A1" },
  { locationId: "601-002-A1", zone: Zone.Z4, aisle: "601", bay: "002", level: "A", displayLabel: "601-002-A1" },
  { locationId: "602-001-B1", zone: Zone.Z4, aisle: "602", bay: "001", level: "B", displayLabel: "602-001-B1" },

  // HAZ (Hazardous)
  { locationId: "HAZ-001-A1", zone: Zone.HAZ, aisle: "HAZ", bay: "001", level: "A", displayLabel: "HAZ-001-A1" },
  { locationId: "HAZ-001-B1", zone: Zone.HAZ, aisle: "HAZ", bay: "001", level: "B", displayLabel: "HAZ-001-B1" },
  { locationId: "HAZ-002-A1", zone: Zone.HAZ, aisle: "HAZ", bay: "002", level: "A", displayLabel: "HAZ-002-A1" },
];

export const LOCATIONS_BY_ZONE: Record<Zone, WarehouseLocation[]> = {
  [Zone.Z1]:  WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.Z1),
  [Zone.Z2]:  WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.Z2),
  [Zone.Z3]:  WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.Z3),
  [Zone.Z4]:  WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.Z4),
  [Zone.HAZ]: WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.HAZ),
  [Zone.FEX]: WAREHOUSE_LOCATIONS.filter(l => l.zone === Zone.Z1), // FEX pulls from Z1
};

export function getLocation(locationId: string): WarehouseLocation | undefined {
  return WAREHOUSE_LOCATIONS.find(l => l.locationId === locationId);
}

// ─── Items ────────────────────────────────────────────────────────────────────
// TODO: Replace with real product catalog from GEODIS.
// SKUs, UPCs, and descriptions are representative placeholders.
// lastFourDigits matches the "Item (Last 4)" field shown on RF Device.

export const WAREHOUSE_ITEMS: WarehouseItem[] = [
  // Standard consumables / household
  {
    itemId:          "item-001",
    sku:             "024505572",
    upcBarcode:      "024505572001",
    description:     "Paper Towels 6-Pack",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "4375",
    weight:          1.2,
  },
  {
    itemId:          "item-002",
    sku:             "031200234",
    upcBarcode:      "031200234002",
    description:     "Dish Soap 24oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "8821",
    weight:          0.8,
  },
  {
    itemId:          "item-003",
    sku:             "047400118",
    upcBarcode:      "047400118003",
    description:     "Laundry Detergent 64oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "2290",
    weight:          2.1,
  },
  {
    itemId:          "item-004",
    sku:             "037000864",
    upcBarcode:      "037000864004",
    description:     "All-Purpose Cleaner Spray",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "6614",
    weight:          0.9,
  },
  {
    itemId:          "item-005",
    sku:             "019200093",
    upcBarcode:      "019200093005",
    description:     "Bottled Water 24pk",
    unitOfMeasure:   "Case",
    lastFourDigits:  "3305",
    weight:          11.3,
  },
  {
    itemId:          "item-006",
    sku:             "028400097",
    upcBarcode:      "028400097006",
    description:     "Snack Chips 8oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "7712",
    weight:          0.3,
  },
  {
    itemId:          "item-007",
    sku:             "041290117",
    upcBarcode:      "041290117007",
    description:     "Shampoo 12oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "1198",
    weight:          0.5,
  },
  {
    itemId:          "item-008",
    sku:             "011111065",
    upcBarcode:      "011111065008",
    description:     "Toothpaste Twin Pack",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "5509",
    weight:          0.4,
  },
  {
    itemId:          "item-009",
    sku:             "073010000",
    upcBarcode:      "073010000009",
    description:     "Coffee Pods 12ct",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "0001",
    weight:          0.7,
  },
  {
    itemId:          "item-010",
    sku:             "016000275",
    upcBarcode:      "016000275010",
    description:     "Cereal 18oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "2750",
    weight:          0.6,
  },
  // HAZ items (Zone HAZ)
  {
    itemId:          "item-haz-001",
    sku:             "085239041",
    upcBarcode:      "085239041011",
    description:     "Bleach 96oz (HAZ)",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "0411",
    weight:          3.4,
    isHazardous:     true,
  },
  {
    itemId:          "item-haz-002",
    sku:             "085239055",
    upcBarcode:      "085239055012",
    description:     "Drain Cleaner 32oz (HAZ)",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "0122",
    weight:          1.1,
    isHazardous:     true,
  },
  // Multi-quantity items (tests PK_PICK_QUANTITY > 1)
  {
    itemId:          "item-multi-001",
    sku:             "030000315",
    upcBarcode:      "030000315013",
    description:     "Yogurt Cup 6oz",
    unitOfMeasure:   "Unit",
    lastFourDigits:  "3133",
    weight:          0.2,
  },
  {
    itemId:          "item-multi-002",
    sku:             "021130126",
    upcBarcode:      "021130126014",
    description:     "Granola Bar 6-Pack",
    unitOfMeasure:   "Case",
    lastFourDigits:  "1264",
    weight:          0.8,
  },
];

export function getItem(itemId: string): WarehouseItem | undefined {
  return WAREHOUSE_ITEMS.find(i => i.itemId === itemId);
}

export function getItemBySku(sku: string): WarehouseItem | undefined {
  return WAREHOUSE_ITEMS.find(i => i.sku === sku);
}

// ─── Tote Templates ───────────────────────────────────────────────────────────
// Pre-built tote sets for simulation scenarios.
// Format from SOP screenshots: T + 14 digits (e.g. T00000000011692)

export function buildToteSet(cartIndex: number = 0): Tote[] {
  // Generate 9 totes with sequential IDs
  // Base offset varies per cart to avoid barcode collisions across sessions
  const base = 11692 + cartIndex * 100;
  return Array.from({ length: 9 }, (_, i) => ({
    toteId:          `T${String(base + i).padStart(14, "0")}`,
    barcode:         `T${String(base + i).padStart(14, "0")}`,
    slot:            (i + 1) as 1|2|3|4|5|6|7|8|9,
    pickedItems:     [],
    isComplete:      false,
    placedOnConveyor: false,
  }));
}

// Named tote sets for consistent test scenarios
export const TOTE_SETS = {
  /** Standard 9-tote set — Zone 1 cart */
  ZONE1_SET_A: buildToteSet(0),
  /** Zone 2 cart */
  ZONE2_SET_A: buildToteSet(10),
  /** HAZ cart (usually fewer totes, but still 9 slots) */
  HAZ_SET_A:   buildToteSet(20),
  /** Express (FEX) cart */
  FEX_SET_A:   buildToteSet(30),
};

// ─── Cart Templates ───────────────────────────────────────────────────────────
// Format from SOP screenshots: C + 9 digits (e.g. C000000083)

export const CART_TEMPLATES: Record<string, Omit<PickCart, "totes" | "totalItemsPicked" | "isBuilt">> = {
  CART_Z1_A: {
    cartId:      "cart-z1-a",
    cartBarcode: "C000000083",
    zone:        Zone.Z1,
    taskGroup:   "Z1",
    roundNumber: 1,
  },
  CART_Z1_B: {
    cartId:      "cart-z1-b",
    cartBarcode: "C000000084",
    zone:        Zone.Z1,
    taskGroup:   "Z1",
    roundNumber: 1,
  },
  CART_Z2_A: {
    cartId:      "cart-z2-a",
    cartBarcode: "C000000091",
    zone:        Zone.Z2,
    taskGroup:   "Z2",
    roundNumber: 1,
  },
  CART_Z3_A: {
    cartId:      "cart-z3-a",
    cartBarcode: "C000000107",
    zone:        Zone.Z3,
    taskGroup:   "Z3",
    roundNumber: 1,
  },
  CART_Z4_A: {
    cartId:      "cart-z4-a",
    cartBarcode: "C000000115",
    zone:        Zone.Z4,
    taskGroup:   "Z4",
    roundNumber: 1,
  },
  CART_HAZ_A: {
    cartId:      "cart-haz-a",
    cartBarcode: "C000000122",
    zone:        Zone.HAZ,
    taskGroup:   "HAZ",
    roundNumber: 1,
  },
  CART_FEX_A: {
    cartId:      "cart-fex-a",
    cartBarcode: "C000000130",
    zone:        Zone.FEX,
    taskGroup:   "FEX",
    roundNumber: 1,
  },
};

export function buildCart(
  templateKey: keyof typeof CART_TEMPLATES,
  toteSetIndex: number = 0
): PickCart {
  const template = CART_TEMPLATES[templateKey];
  return {
    ...template,
    totes:           buildToteSet(toteSetIndex),
    totalItemsPicked: 0,
    isBuilt:         false,
  };
}

// ─── Pick Task Generators ─────────────────────────────────────────────────────

/** Build a deterministic pick queue for a given zone and count */
export function buildPickQueue(
  zone: Zone,
  count: number,
  startOrderNumber: number = 1000,
): PickTask[] {
  const locations = LOCATIONS_BY_ZONE[zone];
  const items = WAREHOUSE_ITEMS.filter(i =>
    zone === Zone.HAZ ? i.isHazardous : !i.isHazardous
  );

  if (locations.length === 0 || items.length === 0) {
    throw new Error(`No seed data available for zone ${zone}`);
  }

  // Distribute picks across 9 totes
  const picksPerTote = Math.ceil(count / 9);

  return Array.from({ length: count }, (_, i) => {
    const item     = items[i % items.length];
    const location = locations[i % locations.length];
    const slot     = (Math.floor(i / picksPerTote) % 9 + 1) as 1|2|3|4|5|6|7|8|9;
    const toteBase = 11692 + Math.floor(i / picksPerTote);

    return {
      pickTaskId:       `pick-${zone}-${String(i + 1).padStart(4, "0")}`,
      orderNumber:      String(startOrderNumber + i),
      item,
      location,
      quantityRequired: i % 7 === 0 ? 2 : 1, // ~14% of picks require qty > 1
      targetToteId:     `T${String(toteBase).padStart(14, "0")}`,
      targetSlot:       slot,
      isExpress:        zone === Zone.FEX,
    };
  });
}

// ─── Pre-built Scenarios ──────────────────────────────────────────────────────
// Ready-to-use data bundles for simulation scenarios and tests.

export const SCENARIO_DATA = {
  /** 20-pick Zone 1 session — standard lab and first simulation */
  Z1_20_PICKS: {
    cart:      buildCart("CART_Z1_A", 0),
    pickQueue: buildPickQueue(Zone.Z1, 20),
  },

  /** 9-pick Zone 1 session — one full tote, minimal sim */
  Z1_9_PICKS: {
    cart:      buildCart("CART_Z1_A", 1),
    pickQueue: buildPickQueue(Zone.Z1, 9),
  },

  /** 20-pick Zone 2 session */
  Z2_20_PICKS: {
    cart:      buildCart("CART_Z2_A", 10),
    pickQueue: buildPickQueue(Zone.Z2, 20, 2000),
  },

  /** HAZ zone — 10 picks, hazardous items only */
  HAZ_10_PICKS: {
    cart:      buildCart("CART_HAZ_A", 20),
    pickQueue: buildPickQueue(Zone.HAZ, 10, 3000),
  },

  /** Express (FEX) — 15 picks, all isExpress: true */
  FEX_15_PICKS: {
    cart:      buildCart("CART_FEX_A", 30),
    pickQueue: buildPickQueue(Zone.FEX, 15, 4000),
  },
};

// ─── Zone Barcode Map ─────────────────────────────────────────────────────────
// The barcode the picker scans to select a Zone/Task Group (BBWD-WI-030 §5.1.9)
// TODO: Confirm actual barcode values from facility labeling with ops team.

export const ZONE_BARCODES: Record<string, string> = {
  Z1:  "ZONE-Z1-BARCODE",
  Z2:  "ZONE-Z2-BARCODE",
  Z3:  "ZONE-Z3-BARCODE",
  Z4:  "ZONE-Z4-BARCODE",
  HAZ: "ZONE-HAZ-BARCODE",
  FEX: "ZONE-FEX-BARCODE",
};
