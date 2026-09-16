/**
 * GEODIS Nashville Simulation — Central Asset Registry
 *
 * Single source of truth for runtime visual asset mappings connecting WMS simulation
 * state, SKUs, defects, locations, equipment, and background plates directly
 * to production assets cataloged in ASSET_MANIFEST.md.
 */

import { WorkflowStep } from "@/types/domain"

export const SKU_ASSET_MAP: Record<string, string> = {
  // Primary 14 Inventory SKUs — mapped to photorealistic assets
  "024505572": "/assets/products/item_widget_alpha_photoreal.png",
  "031200000": "/assets/products/item_bracket_steel_photoreal.png",
  "012345678": "/assets/products/item_foam_packing.svg",
  "071050030": "/assets/products/item_tape_roll.svg",
  "041333040": "/assets/products/item_cable_tie_bag.svg",
  "052000002": "/assets/products/item_label_sheet.svg",
  "063200012": "/assets/products/item_pallet_wrap.svg",
  "074300010": "/assets/products/item_corner_protector.svg",
  "085000009": "/assets/products/item_bubble_wrap.svg",
  "096100025": "/assets/products/item_cardboard_insert.svg",
  "107200030": "/assets/products/item_bolt_set_m8.svg",
  "118300015": "/assets/products/item_washer_pack.svg",
  "129400020": "/assets/products/item_nut_set_m8.svg",
  "140500035": "/assets/products/item_solvent_cleaner_photoreal.png",

  // Specialized scenario items (Day 1-5, tools & twin traps)
  "024505590": "/assets/products/item_torque_wrench_photoreal.png",
  "024505592": "/assets/products/item_grease_gun.svg",
  "024505580": "/assets/products/item_alpha_pro_photoreal.png",
  "024505581": "/assets/products/item_alpha_lite_photoreal.png",
}

export const ITEM_ID_ASSET_MAP: Record<string, string> = {
  "item-001": "/assets/products/item_widget_alpha_photoreal.png",
  "item-widget-blue": "/assets/products/item_widget_alpha_photoreal.png",
  "item-widget-green": "/assets/products/item_widget_green_photoreal.png",
  "item-002": "/assets/products/item_bracket_steel_photoreal.png",
  "item-003": "/assets/products/item_foam_packing.svg",
  "item-004": "/assets/products/item_tape_roll.svg",
  "item-005": "/assets/products/item_cable_tie_bag.svg",
  "item-006": "/assets/products/item_label_sheet.svg",
  "item-007": "/assets/products/item_pallet_wrap.svg",
  "item-008": "/assets/products/item_corner_protector.svg",
  "item-009": "/assets/products/item_bubble_wrap.svg",
  "item-010": "/assets/products/item_cardboard_insert.svg",
  "item-011": "/assets/products/item_bolt_set_m8.svg",
  "item-012": "/assets/products/item_washer_pack.svg",
  "item-013": "/assets/products/item_nut_set_m8.svg",
  "item-014": "/assets/products/item_solvent_cleaner_photoreal.png",
  "item-torque-wrench": "/assets/products/item_torque_wrench_photoreal.png",
  "item-grease-gun": "/assets/products/item_grease_gun.svg",
  "item-alpha-pro": "/assets/products/item_alpha_pro_photoreal.png",
  "item-alpha-lite": "/assets/products/item_alpha_lite_photoreal.png",
}

export const DEFECT_ASSET_MAP: Record<string, { path: string; label: string; actionHint: string }> = {
  SCRATCHED_BARCODE: {
    path: "/assets/products/defect_scratched_barcode.png",
    label: "BARCODE TORN / SCRATCHED",
    actionHint: "USE CTRL+M",
  },
  CRUSHED_CARTON: {
    path: "/assets/products/defect_crushed_carton.png",
    label: "CARTON CRUSHED / DAMAGED",
    actionHint: "USE CTRL+D",
  },
  HAZMAT_SPILL: {
    path: "/assets/products/defect_leaking_hazmat.png",
    label: "HAZARDOUS CHEMICAL LEAK",
    actionHint: "USE CTRL+H",
  },
}

export const EQUIPMENT_ASSETS = {
  cart: {
    svg: "/assets/equipment/pick_cart.svg",
    sprite: "/assets/equipment/pick_cart_photoreal.png",
  },
  toteStandard: {
    empty: "/assets/equipment/tote_standard_empty.svg",
    loaded: "/assets/equipment/tote_standard_loaded.svg",
    sprite: "/assets/equipment/tote_standard_photoreal.png",
  },
  toteHazmat: {
    empty: "/assets/equipment/tote_hazmat_empty.svg",
    loaded: "/assets/equipment/tote_hazmat_loaded.svg",
    sprite: "/assets/equipment/tote_hazmat_photoreal.png",
  },
  terminal: "/assets/equipment/wearable_terminal_photoreal.png",
  ringScanner: "/assets/equipment/ring_scanner_photoreal.png",
  reachTruck: "/assets/equipment/reach_truck_photoreal.png",
  columnBollard: "/assets/equipment/column_bollard_geodis.svg",
  rackElevation: "/assets/equipment/rack_elevation_bay01.svg",
  emptyBin: "/assets/equipment/empty_bin_slot.svg",
  partialBin: "/assets/equipment/partial_bin_slot.svg",
}

export const ENVIRONMENT_PLATES = {
  inboundDock: "/assets/simulation/inbound_dock_plate.jpg",
  aisle: "/assets/simulation/aisle_plate.jpg",
  rackPickFace: "/assets/simulation/photoreal_pick_face_carton.jpg",
  conveyor: "/assets/simulation/conveyor_plate.jpg",
  hazmat: "/assets/simulation/hazmat_staging_bay.jpg",
}

export const BARCODE_ASSETS = {
  cart04: "/assets/barcodes/barcode_cart_04.svg",
  tote01: "/assets/barcodes/barcode_tote_01.svg",
  tote09Haz: "/assets/barcodes/barcode_tote_09_haz.svg",
  loc316_01_a_01: "/assets/barcodes/barcode_loc_316_01_a_01.svg",
  loc316_01_b_01: "/assets/barcodes/barcode_loc_316_01_b_01.svg",
  loc316_01_c_01: "/assets/barcodes/barcode_loc_316_01_c_01.svg",
  loc316_01_d_01: "/assets/barcodes/barcode_loc_316_01_d_01.svg",
}

export const UI_ASSETS = {
  reticleScanBeam: "/assets/ui/ui_reticle_scan_beam.svg",
  reticleLockSuccess: "/assets/ui/ui_reticle_lock_success.svg",
  reticleLockError: "/assets/ui/ui_reticle_lock_error.svg",
  mapBlueprint: "/assets/ui/map_blueprint_facility.svg",
  mapSerpentine: "/assets/ui/map_serpentine_route.svg",
}

export function getProductAsset(skuOrId: string): string {
  return SKU_ASSET_MAP[skuOrId] || ITEM_ID_ASSET_MAP[skuOrId] || "/assets/products/item_widget_alpha.svg"
}

export function getDefectAsset(defectType?: string | null) {
  if (!defectType) return null
  return DEFECT_ASSET_MAP[defectType] || null
}

export function getEnvironmentPlateForStep(step: WorkflowStep, isHazmatScenario: boolean = false): string {
  if (isHazmatScenario && (step === WorkflowStep.EX_HAZMAT_REDIRECT || step.startsWith("EX_"))) {
    return ENVIRONMENT_PLATES.hazmat
  }
  if (step.startsWith("BC_")) {
    return ENVIRONMENT_PLATES.inboundDock
  }
  if (
    step === WorkflowStep.PK_END_OF_TOTE_DISPLAY ||
    step === WorkflowStep.PK_PRESS_CTRL_A ||
    step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR ||
    step === WorkflowStep.PS_ROUND_COMPLETE
  ) {
    return ENVIRONMENT_PLATES.conveyor
  }
  return ENVIRONMENT_PLATES.aisle
}
