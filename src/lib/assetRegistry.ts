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
  "012345678": "/assets/scenes/geodis-scene-pick-face.jpg",
  "071050030": "/assets/scenes/geodis-scene-pick-face.jpg",
  "041333040": "/assets/scenes/geodis-scene-pick-face.jpg",
  "052000002": "/assets/scenes/geodis-scene-pick-face.jpg",
  "063200012": "/assets/scenes/geodis-scene-pick-face.jpg",
  "074300010": "/assets/scenes/geodis-scene-pick-face.jpg",
  "085000009": "/assets/scenes/geodis-scene-pick-face.jpg",
  "096100025": "/assets/scenes/geodis-scene-pick-face.jpg",
  "107200030": "/assets/scenes/geodis-scene-pick-face.jpg",
  "118300015": "/assets/scenes/geodis-scene-pick-face.jpg",
  "129400020": "/assets/scenes/geodis-scene-pick-face.jpg",
  "140500035": "/assets/products/item_solvent_cleaner_photoreal.png",

  // Specialized scenario items (Day 1-5, tools & twin traps)
  "024505590": "/assets/products/item_torque_wrench_photoreal.png",
  "024505592": "/assets/products/item_torque_wrench_photoreal.png",
  "024505580": "/assets/products/item_alpha_pro_photoreal.png",
  "024505581": "/assets/products/item_alpha_lite_photoreal.png",
}

export const ITEM_ID_ASSET_MAP: Record<string, string> = {
  "item-001": "/assets/products/item_widget_alpha_photoreal.png",
  "item-widget-blue": "/assets/products/item_widget_alpha_photoreal.png",
  "item-widget-green": "/assets/products/item_widget_green_photoreal.png",
  "item-002": "/assets/products/item_bracket_steel_photoreal.png",
  "item-003": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-004": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-005": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-006": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-007": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-008": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-009": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-010": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-011": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-012": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-013": "/assets/scenes/geodis-scene-pick-face.jpg",
  "item-014": "/assets/products/item_solvent_cleaner_photoreal.png",
  "item-torque-wrench": "/assets/products/item_torque_wrench_photoreal.png",
  "item-grease-gun": "/assets/products/item_torque_wrench_photoreal.png",
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
    sprite: "/assets/scenes/geodis-scene-cart-loaded.jpg",
  },
  toteStandard: {
    empty: "/assets/equipment/tote_standard_empty.svg",
    loaded: "/assets/equipment/tote_standard_loaded.svg",
    sprite: "/assets/scenes/geodis-scene-tote-slot.jpg",
  },
  toteHazmat: {
    empty: "/assets/equipment/tote_hazmat_empty.svg",
    loaded: "/assets/equipment/tote_hazmat_loaded.svg",
    sprite: "/assets/equipment/tote_hazmat_loaded.svg",
  },
  terminal: "/assets/equipment/wearable_terminal_wt4000.svg",
  ringScanner: "/assets/equipment/ring_scanner_rs5100.svg",
  reachTruck: "/assets/equipment/reach_truck_crown.svg",
  columnBollard: "/assets/equipment/column_bollard_geodis.svg",
  rackElevation: "/assets/equipment/rack_elevation_bay01.svg",
  emptyBin: "/assets/equipment/empty_bin_slot.svg",
  partialBin: "/assets/equipment/partial_bin_slot.svg",
}

export const GEODIS_SCENES = {
  commandCenter: "/assets/scenes/geodis-scene-command-center.jpg",
  cartStaging: "/assets/scenes/geodis-scene-cart-staging.jpg",
  cartLoaded: "/assets/scenes/geodis-scene-cart-loaded.jpg",
  zonePlacard: "/assets/scenes/geodis-scene-zone-placard.jpg",
  cartBarcode: "/assets/scenes/geodis-scene-cart-barcode.jpg",
  toteSlot: "/assets/scenes/geodis-scene-tote-slot.jpg",
  pickFace: "/assets/scenes/geodis-scene-pick-face.jpg",
  putwall: "/assets/scenes/geodis-scene-putwall.jpg",
} as const

export const ENVIRONMENT_PLATES = {
  inboundDock: "/assets/scenes/geodis-scene-command-center.jpg",
  cartStaging: "/assets/scenes/geodis-scene-cart-staging.jpg",
  cartLoaded: "/assets/scenes/geodis-scene-cart-loaded.jpg",
  zonePlacard: "/assets/scenes/geodis-scene-zone-placard.jpg",
  cartBarcode: "/assets/scenes/geodis-scene-cart-barcode.jpg",
  toteSlot: "/assets/scenes/geodis-scene-tote-slot.jpg",
  aisle: "/assets/scenes/geodis-scene-pick-face.jpg",
  rackPickFace: "/assets/scenes/geodis-scene-pick-face.jpg",
  conveyor: "/assets/scenes/geodis-scene-putwall.jpg",
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
  return SKU_ASSET_MAP[skuOrId] || ITEM_ID_ASSET_MAP[skuOrId] || "/assets/products/item_widget_alpha_photoreal.png"
}

export function getDefectAsset(defectType?: string | null) {
  if (!defectType) return null
  return DEFECT_ASSET_MAP[defectType] || null
}

export function getEnvironmentPlateForStep(step: WorkflowStep, isHazmatScenario: boolean = false): string {
  if (isHazmatScenario && (step === WorkflowStep.EX_HAZMAT_REDIRECT || step.startsWith("EX_"))) {
    return ENVIRONMENT_PLATES.hazmat
  }
  // §5.1.1–5.1.2: Command Center
  if (step === WorkflowStep.BC_TRAVEL_TO_CC || step === WorkflowStep.BC_RECEIVE_TOTE_COUNT) {
    return GEODIS_SCENES.commandCenter
  }
  // §5.1.3: Cart staging lane
  if (step === WorkflowStep.BC_OBTAIN_CART) {
    return GEODIS_SCENES.cartStaging
  }
  // §5.1.9: Zone placard at aisle entrance
  if (step === WorkflowStep.BC_SCAN_ZONE_TASK_GROUP) {
    return GEODIS_SCENES.zonePlacard
  }
  // §5.1.11: Cart barcode close-up
  if (step === WorkflowStep.BC_SCAN_CART_BARCODE) {
    return GEODIS_SCENES.cartBarcode
  }
  // §5.1.12–13: Tote seated in numbered slot
  if (step === WorkflowStep.BC_PLACE_TOTE_IN_SLOT || step === WorkflowStep.BC_SCAN_TOTE_BARCODE) {
    return GEODIS_SCENES.toteSlot
  }
  // §5.1.4, login, ^E, pickup: Loaded cart
  if (
    step === WorkflowStep.BC_LOAD_TOTES ||
    step === WorkflowStep.BC_LOGIN_RF ||
    step === WorkflowStep.BC_SELECT_BBWD ||
    step === WorkflowStep.BC_SELECT_OUTBOUND_PHASE_2 ||
    step === WorkflowStep.BC_CTRL_T_TASK_GROUP ||
    step === WorkflowStep.BC_ENTER_TASK_GROUP ||
    step === WorkflowStep.BC_CONFIRM_TASK_GROUP ||
    step === WorkflowStep.BC_SELECT_MAKE_TOTE_CART ||
    step === WorkflowStep.BC_PRESS_CTRL_E
  ) {
    return GEODIS_SCENES.cartLoaded
  }
  // §5.2.14–5.2.16: Putwall / takeaway conveyor
  if (
    step === WorkflowStep.PK_END_OF_TOTE_DISPLAY ||
    step === WorkflowStep.PK_PRESS_CTRL_A ||
    step === WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR ||
    step === WorkflowStep.PS_ROUND_COMPLETE
  ) {
    return GEODIS_SCENES.putwall
  }
  // §5.2.5–5.2.9: Pick face with cartons
  return GEODIS_SCENES.pickFace
}
