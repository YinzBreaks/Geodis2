/**
 * training-scenario.ts — Default RF-device training scenario (Overhaul 2B)
 *
 * Real barcode values captured from the live Symbol WT4000 device photos,
 * extended into a full 15-pick zone run. Used by the immersive simulator
 * overhaul as default demo/training data.
 *
 * Barcode formats (per CLAUDE.md §Seed Data):
 *   Cart:     C + 9 digits   → C900001413
 *   Tote:     T + 13 digits  → T0000000016834
 *   Item:     9-digit item number (UPC last-4 shown separately on device)
 *   Aloc:     A##-###-A#      → A50-049-A1  (aisle-bay-shelf level)
 *
 * NOTE: these are representative training values. Replace with the real
 * GEODIS product catalog once data access is confirmed.
 */

/** Unit of measure shown on the RF "Qty:" line. */
export type UnitType = "Unit" | "Case" | "Each"

/** A single pick record as displayed on the WT4000 Pick screen. */
export interface TrainingPick {
  /** Tote barcode the item is placed into. */
  tote: string
  /** Aisle-location string shown as "Aloc:" (e.g. "A50-049-A1"). */
  aloc: string
  /** Full item number shown as "Item:". */
  item: string
  /** Last 4 digits shown as "Item (Last 4):". */
  itemLast4: string
  /** Quantity to pick. */
  qty: number
  /** Unit of measure. */
  unitType: UnitType
}

export interface TrainingScenario {
  picker: { id: string; zone: string }
  taskGroup: string
  cart: {
    barcode: string
    slots: number
    totes: string[]
  }
  picks: TrainingPick[]
}

/** The 9 tote barcodes assigned to the cart's slots (real + sequential). */
const TOTES: string[] = [
  "T0000000016834",
  "T0000000011692",
  "T0000000011693",
  "T0000000011694",
  "T0000000011695",
  "T0000000016838",
  "T0000000016839",
  "T0000000016840",
  "T0000000016841",
]

/**
 * 15 realistic picks across Zone 1, serpentine through aisles A50→B30,
 * shelf levels A1–A5, quantities 1–3. Each item's last-4 matches the tail
 * of its item number so partial-match validation stays consistent.
 */
const PICKS: TrainingPick[] = [
  { tote: TOTES[0], aloc: "A50-049-A1", item: "028018120", itemLast4: "8120", qty: 1, unitType: "Unit" },
  { tote: TOTES[0], aloc: "A50-051-A2", item: "024505572", itemLast4: "5572", qty: 1, unitType: "Unit" },
  { tote: TOTES[0], aloc: "A50-063-A1", item: "031604877", itemLast4: "4877", qty: 2, unitType: "Unit" },
  { tote: TOTES[1], aloc: "A52-008-A3", item: "047112309", itemLast4: "2309", qty: 1, unitType: "Unit" },
  { tote: TOTES[1], aloc: "A52-014-A1", item: "059320148", itemLast4: "0148", qty: 3, unitType: "Each" },
  { tote: TOTES[1], aloc: "A54-022-A2", item: "061447781", itemLast4: "7781", qty: 1, unitType: "Unit" },
  { tote: TOTES[2], aloc: "A54-035-A4", item: "072901336", itemLast4: "1336", qty: 1, unitType: "Unit" },
  { tote: TOTES[2], aloc: "A56-007-A1", item: "083215094", itemLast4: "5094", qty: 2, unitType: "Case" },
  { tote: TOTES[3], aloc: "A58-040-A2", item: "090118627", itemLast4: "8627", qty: 1, unitType: "Unit" },
  { tote: TOTES[3], aloc: "A58-044-A5", item: "104773250", itemLast4: "3250", qty: 1, unitType: "Unit" },
  { tote: TOTES[4], aloc: "B12-011-A1", item: "118903461", itemLast4: "3461", qty: 2, unitType: "Unit" },
  { tote: TOTES[4], aloc: "B12-019-A3", item: "126540982", itemLast4: "0982", qty: 1, unitType: "Each" },
  { tote: TOTES[5], aloc: "B20-006-A2", item: "133208715", itemLast4: "8715", qty: 1, unitType: "Unit" },
  { tote: TOTES[5], aloc: "B26-031-A1", item: "147661203", itemLast4: "1203", qty: 3, unitType: "Unit" },
  { tote: TOTES[6], aloc: "B30-052-A4", item: "150994338", itemLast4: "4338", qty: 1, unitType: "Unit" },
]

export const TRAINING_SCENARIO: TrainingScenario = {
  picker: { id: "TRAINEE001", zone: "Z1" },
  taskGroup: "#L9",
  cart: {
    barcode: "C900001413",
    slots: 9,
    totes: TOTES,
  },
  picks: PICKS,
}
