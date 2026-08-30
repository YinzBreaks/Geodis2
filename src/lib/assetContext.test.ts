/**
 * assetContext.test.ts — Unit tests for getAssetContext
 *
 * Verifies that the correct warehouse assets are shown and scannable
 * at each workflow step.
 *
 * Per CLAUDE.md §Testing: test files adjacent to source.
 */

import { describe, it, expect } from "vitest"
import { getAssetContext } from "./assetContext"
import {
  WorkflowStep,
  Zone,
  ContentType,
  DifficultyLevel,
  ScanResult,
  type SimulationSession,
  type PickCart,
  type Tote,
  type ToteSlot,
  type PickTask,
  type WarehouseItem,
  type WarehouseLocation,
} from "@/types/domain"

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

function makeTote(slot: ToteSlot, barcode: string): Tote {
  return {
    toteId: `tote-s${slot}`,
    barcode,
    slot,
    pickedItems: [],
    isComplete: false,
    placedOnConveyor: false,
  }
}

function makeNineTotes(): Tote[] {
  return Array.from({ length: 9 }, (_, i) => {
    const slot = (i + 1) as ToteSlot
    return makeTote(slot, `T${String(11691 + slot).padStart(14, "0")}`)
  })
}

function makeCart(): PickCart {
  return {
    cartId: "cart-001",
    cartBarcode: "C000000083",
    totes: makeNineTotes(),
    zone: Zone.Z1,
    taskGroup: Zone.Z1,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
  }
}

function makeItem(): WarehouseItem {
  return {
    itemId: "item-001",
    sku: "024505572",
    upcBarcode: "024505572001",
    description: "Widget Alpha",
    unitOfMeasure: "Unit",
    lastFourDigits: "2001",
  }
}

function makeLocation(): WarehouseLocation {
  return {
    locationId: "loc-001",
    zone: Zone.Z1,
    aisle: "316",
    bay: "001",
    level: "A1",
    displayLabel: "316-001-A1",
  }
}

function makePickTask(): PickTask {
  return {
    pickTaskId: "pt-001",
    orderNumber: "ORD-001",
    item: makeItem(),
    location: makeLocation(),
    quantityRequired: 1,
    targetToteId: "tote-s1",
    targetSlot: 1,
    isExpress: false,
  }
}

function makeSession(
  overrides: Partial<SimulationSession> = {}
): SimulationSession {
  return {
    sessionId: "sess-test",
    userId: "user-test",
    moduleId: "mod-test",
    moduleType: ContentType.SIMULATION,
    difficulty: DifficultyLevel.BEGINNER,
    toteStack: [],
    cart: makeCart(),
    pickQueue: [makePickTask()],
    completedPicks: [],
    currentStep: WorkflowStep.BC_LOGIN_RF,
    currentPickIndex: 0,
    currentToteSlot: 1 as ToteSlot,
    scanEvents: [],
    errors: [],
    startedAt: new Date(),
    status: "IN_PROGRESS",
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("getAssetContext", () => {
  it("BC_SCAN_CART_BARCODE → scannableAsset: 'cart'", () => {
    const s = makeSession({ currentStep: WorkflowStep.BC_SCAN_CART_BARCODE })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(true)
    expect(ctx.scannableAsset).toBe("cart")
    expect(ctx.highlightedBarcode).toBe("C000000083")
  })

  it("PK_SCAN_ITEM_UPC → scannableAsset: 'item'", () => {
    const s = makeSession({
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showShelf).toBe(true)
    expect(ctx.showItem).toBe(true)
    expect(ctx.scannableAsset).toBe("item")
    expect(ctx.highlightedBarcode).toBe("024505572001")
  })

  it("PK_SCAN_TOTE_BARCODE → scannableAsset: 'tote'", () => {
    const s = makeSession({
      currentStep: WorkflowStep.PK_SCAN_TOTE_BARCODE,
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(true)
    expect(ctx.showTotes).toBe(true)
    expect(ctx.scannableAsset).toBe("tote")
    expect(ctx.highlightedBarcode).toBe("T00000000011692") // slot 1 tote
  })

  it("PK_VERIFY_LOCATION → scannableAsset: null (CONFIRM step, location highlighted for reference)", () => {
    const s = makeSession({
      currentStep: WorkflowStep.PK_VERIFY_LOCATION,
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showShelf).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
    expect(ctx.highlightedBarcode).toBe("316-001-A1")
  })

  it("BC_SELECT_BBWD → scannableAsset: null", () => {
    const s = makeSession({ currentStep: WorkflowStep.BC_SELECT_BBWD })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
    expect(ctx.highlightedBarcode).toBeNull()
  })

  it("EX_INVALID_ITEM_LAST during pick → shows shelf (keeps pick context)", () => {
    const s = makeSession({
      currentStep: WorkflowStep.EX_INVALID_ITEM_LAST,
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showShelf).toBe(true)
    expect(ctx.showItem).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
  })

  it("EX_TOTE_ALREADY_ALLOCATED during build cart → shows cart", () => {
    const s = makeSession({
      currentStep: WorkflowStep.EX_TOTE_ALREADY_ALLOCATED,
      pickQueue: [], // no picks → build cart context
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(true)
    expect(ctx.showTotes).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
  })

  it("BC_SCAN_TOTE_BARCODE → highlights current tote slot", () => {
    const s = makeSession({
      currentStep: WorkflowStep.BC_SCAN_TOTE_BARCODE,
      currentToteSlot: 3 as ToteSlot,
    })
    const ctx = getAssetContext(s.currentStep, s)
    // Slot 3 → totes[2] → barcode T00000000011694
    expect(ctx.highlightedBarcode).toBe("T00000000011694")
    expect(ctx.scannableAsset).toBe("tote")
    expect(ctx.activeToteSlot).toBe(3)
  })

  it("BC_PLACE_TOTE_IN_SLOT → exposes activeToteSlot for visual targeting", () => {
    const s = makeSession({
      currentStep: WorkflowStep.BC_PLACE_TOTE_IN_SLOT,
      currentToteSlot: 4 as ToteSlot,
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(true)
    expect(ctx.showTotes).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
    expect(ctx.activeToteSlot).toBe(4)
  })

  it("PK_SCAN_TOTE_BARCODE → activeToteSlot tracks pick target slot (not currentToteSlot)", () => {
    const pick = makePickTask()
    const s = makeSession({
      currentStep: WorkflowStep.PK_SCAN_TOTE_BARCODE,
      currentToteSlot: 9 as ToteSlot,
      pickQueue: [{ ...pick, targetSlot: 2 as ToteSlot }],
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.scannableAsset).toBe("tote")
    expect(ctx.activeToteSlot).toBe(2)
    expect(ctx.highlightedBarcode).toBe("T00000000011693")
  })

  it("PS_ROUND_COMPLETE → no assets shown", () => {
    const s = makeSession({ currentStep: WorkflowStep.PS_ROUND_COMPLETE })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showCart).toBe(false)
    expect(ctx.showShelf).toBe(false)
    expect(ctx.scannableAsset).toBeNull()
  })

  it("PK_TRAVEL_TO_LOCATION → shelf visible, nothing scannable", () => {
    const s = makeSession({
      currentStep: WorkflowStep.PK_TRAVEL_TO_LOCATION,
      cart: { ...makeCart(), isBuilt: true },
    })
    const ctx = getAssetContext(s.currentStep, s)
    expect(ctx.showShelf).toBe(true)
    expect(ctx.showItem).toBe(true)
    expect(ctx.scannableAsset).toBeNull()
  })
})
