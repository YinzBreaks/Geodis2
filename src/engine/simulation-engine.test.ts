/**
 * simulation-engine.test.ts
 *
 * Unit tests for the simulation engine state machine.
 * Per CLAUDE.md §Testing: all state transitions must have unit tests,
 * covering both happy paths AND every exception from §6.
 *
 * Test organisation:
 *  1. Build Cart happy path (login → CTRL+E)
 *  2. Pick happy path (one item → End Of Tote → CTRL+A)
 *  3. Sequence enforcement (CTRL+E, CTRL+A, scan ordering)
 *  4. Wrong scan scenarios (WRONG_ITEM, WRONG_TOTE)
 *  5. getCurrentScreen output validation
 *  6. Scoring
 *  7. Error injection and exception resolution paths
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  startSessionWithTasks,
  dispatch,
  getCurrentScreen,
  calculateScore,
} from "@/engine/simulation-engine"
import {
  WorkflowStep,
  ScanResult,
  Zone,
  ContentType,
  DifficultyLevel,
  type SimulationSession,
  type SimulationScenario,
  type PickTask,
  type PickCart,
  type Tote,
  type ToteSlot,
  type WarehouseItem,
  type WarehouseLocation,
} from "@/types/domain"
import { SCENARIO_DATA } from "@/data/seedData"

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURE FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<WarehouseItem> = {}): WarehouseItem {
  return {
    itemId: "item-001",
    sku: "024505572",
    upcBarcode: "00024505572001",
    description: "Test Widget",
    unitOfMeasure: "Unit",
    lastFourDigits: "2001",
    ...overrides,
  }
}

function makeLocation(overrides: Partial<WarehouseLocation> = {}): WarehouseLocation {
  return {
    locationId: "loc-001",
    zone: Zone.Z1,
    aisle: "316",
    bay: "001",
    level: "A1",
    displayLabel: "316-001-A1",
    ...overrides,
  }
}

/** Build a tote with the given slot and an explicit barcode (for scanning). */
function makeTote(slot: ToteSlot, barcode: string): Tote {
  return {
    toteId: `T-slot-${slot}`,
    barcode,
    slot,
    pickedItems: [],
    isComplete: false,
    placedOnConveyor: false,
  }
}

/**
 * Build all 9 totes with T+14-digit barcodes matching the CLAUDE.md seed format.
 * Barcodes: T00000000011692 (slot 1) through T00000000011700 (slot 9).
 * Per CLAUDE.md §Seed Data: barcode format T + 14 digits, e.g. T00000000011692
 */
function makeNineTotes(): Tote[] {
  return Array.from({ length: 9 }, (_, i) => {
    const slot = (i + 1) as ToteSlot
    // baseNum 11691 + slot → slot 1 = 11692, slot 9 = 11700
    return makeTote(slot, `T${String(11691 + slot).padStart(14, "0")}`)
  })
}

function makeCart(overrides: Partial<PickCart> = {}): PickCart {
  return {
    cartId: "cart-001",
    cartBarcode: "C000000083",
    totes: makeNineTotes(),
    zone: Zone.Z1,
    taskGroup: Zone.Z1,
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: false,
    ...overrides,
  }
}

function makePickTask(overrides: Partial<PickTask> = {}): PickTask {
  return {
    pickTaskId: "pick-001",
    orderNumber: "ORD-001",
    item: makeItem(),
    location: makeLocation(),
    quantityRequired: 1,
    targetToteId: "T-slot-1",
    targetSlot: 1 as ToteSlot,
    isExpress: false,
    ...overrides,
  }
}

function makeScenario(overrides: Partial<SimulationScenario> = {}): SimulationScenario {
  return {
    moduleId: "sim-test-01",
    title: "Test Scenario",
    description: "Unit test scenario",
    contentType: ContentType.SIMULATION,
    difficulty: DifficultyLevel.INTERMEDIATE,
    estimatedMinutes: 10,
    zone: Zone.Z1,
    pickCount: 1,
    toteCount: 9,
    steps: [],
    errorScenarios: [
      {
        scenarioId: "err-001",
        injectAtPickIndex: 99, // Default: no injection for most tests
        errorType: ScanResult.WRONG_ITEM,
        description: "Injected test error",
        expectedResolution: [WorkflowStep.EX_NOTIFY_LEAD],
        sopReference: "BBWD-WI-030 §6",
      },
      {
        scenarioId: "err-002",
        injectAtPickIndex: 98,
        errorType: ScanResult.ITEM_NOT_FOUND,
        description: "Injected short inventory",
        expectedResolution: [WorkflowStep.EX_SHORT_INVENTORY],
        sopReference: "BBWD-WI-030 §6.6",
      },
    ],
    passCriteria: { minScore: 75, maxErrors: 5 },
    scoringWeights: { accuracy: 0.6, speed: 0.4 },
    version: "1.0.0",
    lastUpdated: "2026-03-02",
    ...overrides,
  }
}

/** Create a session that has already completed Build Cart (cart is built, at Pick Phase). */
function makePickPhaseSession(
  pickQueue: PickTask[],
  sessionOverrides: Partial<SimulationSession> = {}
): SimulationSession {
  const cart = makeCart({ isBuilt: true })
  const scenario = makeScenario()
  const base = startSessionWithTasks("user-test", scenario, pickQueue, cart)
  return {
    ...base,
    // These fixtures represent a session that has already finished Build Cart:
    // every slot holds the tote scanned into it and the stack is empty. A fresh
    // session starts with blank slots, so the built cart is restored here.
    cart: { ...cart, isBuilt: true },
    toteStack: [],
    currentStep: WorkflowStep.PK_READ_PICK_DISPLAY,
    ...sessionOverrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUILD CART HAPPY PATH
// ─────────────────────────────────────────────────────────────────────────────

describe("Build Cart happy path", () => {
  let session: SimulationSession
  const scenario = makeScenario()
  const cart = makeCart()

  beforeEach(() => {
    session = startSessionWithTasks("user-001", scenario, [], cart)
    // Session now starts at BC_TRAVEL_TO_COMMAND_CENTER (FIX 2).
    // Advance through the 4 pre-login physical steps to reach BC_LOGIN_RF
    // so the remaining Build Cart tests can continue from the login screen.
    session = dispatch(session, { type: "CONFIRM", step: WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER }).session
    session = dispatch(session, { type: "CONFIRM", step: WorkflowStep.BC_RECEIVE_TOTE_COUNT }).session
    session = dispatch(session, { type: "CONFIRM", step: WorkflowStep.BC_OBTAIN_CART }).session
    session = dispatch(session, { type: "CONFIRM", step: WorkflowStep.BC_LOAD_TOTES }).session
    expect(session.currentStep).toBe(WorkflowStep.BC_LOGIN_RF)
    expect(session.status).toBe("IN_PROGRESS")
  })

  it("starts at BC_TRAVEL_TO_COMMAND_CENTER with status IN_PROGRESS", () => {
    const fresh = startSessionWithTasks("user-001", scenario, [], cart)
    expect(fresh.currentStep).toBe(WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER)
    expect(fresh.status).toBe("IN_PROGRESS")
    expect(fresh.cart.isBuilt).toBe(false)
  })

  it("BC_LOGIN_RF → type User ID → BC_SELECT_BBWD", () => {
    const { session: next, result } = dispatch(session, {
      type: "TYPE",
      text: "testuser",
    })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.BC_SELECT_BBWD)
  })

  it("BC_LOGIN_RF rejects empty User ID", () => {
    const { session: same, result } = dispatch(session, {
      type: "TYPE",
      text: "",
    })
    expect(result.success).toBe(false)
    expect(result.feedback).toMatch(/enter your user id/i)
    expect(same.currentStep).toBe(WorkflowStep.BC_LOGIN_RF)
  })

  it("BC_SELECT_BBWD → type '1' → BC_SELECT_OUTBOUND", () => {
    let s = dispatch(session, { type: "TYPE", text: "testuser" }).session
    const { session: next, result } = dispatch(s, { type: "TYPE", text: "1" })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.BC_SELECT_OUTBOUND)
  })

  it("BC_SELECT_OUTBOUND → type '2' → BC_PRESS_CTRL_T", () => {
    let s = dispatch(session, { type: "TYPE", text: "testuser" }).session
    s = dispatch(s, { type: "TYPE", text: "1" }).session
    const { session: next, result } = dispatch(s, { type: "TYPE", text: "2" })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.BC_PRESS_CTRL_T)
  })

  it("navigates through CTRL+T → task group confirm → zone scan", () => {
    let s = dispatch(session, { type: "TYPE", text: "testuser" }).session
    s = dispatch(s, { type: "TYPE", text: "1" }).session
    s = dispatch(s, { type: "TYPE", text: "2" }).session
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+T" }).session
    expect(s.currentStep).toBe(WorkflowStep.BC_CONFIRM_TASK_GROUP)

    s = dispatch(s, { type: "KEY_PRESS", keys: "ENTER+ENTER" }).session
    expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_ZONE_TASK_GROUP)
  })

  it("zone scan → BC_SELECT_MAKE_TOTE_CART", () => {
    let s = dispatch(session, { type: "TYPE", text: "testuser" }).session
    s = dispatch(s, { type: "TYPE", text: "1" }).session
    s = dispatch(s, { type: "TYPE", text: "2" }).session
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+T" }).session
    s = dispatch(s, { type: "KEY_PRESS", keys: "ENTER+ENTER" }).session

    const { session: next, result } = dispatch(s, {
      type: "SCAN",
      value: Zone.Z1, // session cart taskGroup is Z1
    })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.BC_SELECT_MAKE_TOTE_CART)
  })

  it("scans all 9 totes and reaches CTRL+E step", () => {
    // Fast-forward through menu navigation
    let s = advanceThroughBuildCartMenus(session)

    // Scan the cart barcode (use session state — never hardcode)
    s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session
    expect(s.currentStep).toBe(WorkflowStep.BC_PLACE_TOTE_IN_SLOT)

    // Scan all 9 totes
    for (let slot = 1; slot <= 9; slot++) {
      // Confirm placing tote in slot
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session
      expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_TOTE_BARCODE)

      // Grab the next tote off the stack and scan it into the slot the RF
      // Device named (§5.1.13). Slots start empty and are filled by scanning.
      const { session: next, result } = dispatch(s, {
        type: "SCAN",
        value: s.toteStack[0],
      })
      expect(result.success).toBe(true)
      expect(next.cart.totes[slot - 1].barcode).toBe(s.toteStack[0])
      s = next

      if (slot < 9) {
        // After slots 1–8: advance to next slot placement
        expect(s.currentStep).toBe(WorkflowStep.BC_PLACE_TOTE_IN_SLOT)
      } else {
        // After slot 9: advance to BC_PRESS_CTRL_E finalize screen
        // Per FIX 1: slot 9 scan now moves to finalize screen rather than
        // staying at BC_SCAN_TOTE_BARCODE.
        expect(s.currentStep).toBe(WorkflowStep.BC_PRESS_CTRL_E)
      }
    }

    // Now press CTRL+E — all 9 totes are scanned
    const { session: built, result: ctrlEResult } = dispatch(s, {
      type: "KEY_PRESS",
      keys: "CTRL+E",
    })
    expect(ctrlEResult.success).toBe(true)
    expect(built.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)
    expect(built.cart.isBuilt).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. PICK HAPPY PATH
// ─────────────────────────────────────────────────────────────────────────────

describe("Pick happy path — one item → End Of Tote → CTRL+A", () => {
  const item = makeItem()
  const location = makeLocation()
  const task = makePickTask({ item, location })

  it("completes a single pick and reaches End Of Tote display", () => {
    let s = makePickPhaseSession([task])
    expect(s.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)

    // Confirm reading the pick display
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_TRAVEL_TO_LOCATION)

    // Confirm travel to location
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_VERIFY_LOCATION)

    // Confirm location matches
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_VERIFY_ITEM)

    // Confirm item matches
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)

    // Scan item UPC — correct value
    const { session: afterItemScan, result: itemResult } = dispatch(s, {
      type: "SCAN",
      value: item.upcBarcode,
    })
    expect(itemResult.success).toBe(true)
    expect(itemResult.scanResult).toBe(ScanResult.SUCCESS)
    expect(afterItemScan.currentStep).toBe(WorkflowStep.PK_PICK_QUANTITY)
    s = afterItemScan

    // Confirm picking the quantity
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PICK_QUANTITY }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_PLACE_IN_TOTE)

    // Confirm placing in tote
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_IN_TOTE }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_ENTER_QUANTITY)

    // Enter quantity
    s = dispatch(s, { type: "TYPE", text: "1" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_TOTE_BARCODE)

    // Scan tote barcode — task targets slot 1 (use session state — never hardcode)
    const targetToteBarcode = s.cart.totes[task.targetSlot - 1].barcode
    const { session: afterToteScan, result: toteResult } = dispatch(s, {
      type: "SCAN",
      value: targetToteBarcode,
    })
    expect(toteResult.success).toBe(true)
    expect(toteResult.scanResult).toBe(ScanResult.SUCCESS)
    s = afterToteScan

    // Only one pick → last pick → End Of Tote
    expect(s.currentStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)
    expect(s.completedPicks).toHaveLength(1)
  })

  it("CTRL+A after End Of Tote → PK_PRESS_CTRL_A", () => {
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)

    expect(s.currentStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)

    const { session: next, result } = dispatch(s, {
      type: "KEY_PRESS",
      keys: "CTRL+A",
    })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.PK_PRESS_CTRL_A)
  })

  it("PK_PRESS_CTRL_A → confirm → PK_PLACE_TOTE_ON_CONVEYOR", () => {
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+A" }).session

    const { session: next, result } = dispatch(s, {
      type: "CONFIRM",
      step: WorkflowStep.PK_PRESS_CTRL_A,
    })
    expect(result.success).toBe(true)
    expect(next.currentStep).toBe(WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR)
  })

  it("scan events are logged for every successful scan", () => {
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)

    // Two scan events: item UPC + tote barcode
    const scanSteps = s.scanEvents.map((e) => e.step)
    expect(scanSteps).toContain(WorkflowStep.PK_SCAN_ITEM_UPC)
    expect(scanSteps).toContain(WorkflowStep.PK_SCAN_TOTE_BARCODE)
    expect(s.scanEvents.every((e) => e.result === ScanResult.SUCCESS)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. SEQUENCE ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("Sequence enforcement", () => {
  describe("CTRL+E blocked when fewer than 9 totes scanned", () => {
    it("blocks CTRL+E at slot 0 (no totes scanned)", () => {
      const cart = makeCart({
        totes: makeNineTotes().map((t) => ({ ...t, barcode: "" })),
      })
      const session = startSessionWithTasks(
        "user-test",
        makeScenario(),
        [],
        cart
      )
      // Fast-forward to BC_SCAN_TOTE_BARCODE without scanning any totes
      let s = advanceThroughBuildCartMenus(session)
      s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session // cart scan
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session
      // Now at BC_SCAN_TOTE_BARCODE with 0 totes scanned — attempt CTRL+E
      const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+E" })
      expect(result.success).toBe(false)
      expect(result.feedback).toMatch(/scan all tote slots/i)
      expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_TOTE_BARCODE)
    })

    it("blocks CTRL+E when only 8 of 9 totes are scanned", () => {
      // Keep T+14 barcodes for slots 1–8; clear slot 9
      const cart = makeCart({
        totes: makeNineTotes().map((t, i) => ({
          ...t,
          barcode: i < 8 ? t.barcode : "", // slot 9 empty
        })),
      })
      const session = startSessionWithTasks("user-test", makeScenario(), [], cart)
      let s = advanceThroughBuildCartMenus(session)
      s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session

      // Scan 8 totes (use session state for each barcode)
      for (let slot = 1; slot <= 8; slot++) {
        s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session
        s = dispatch(s, { type: "SCAN", value: s.cart.totes[slot - 1].barcode }).session
      }
      // currentToteSlot is now 9, but tote-9 barcode is "" in the cart fixture
      const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+E" })
      expect(result.success).toBe(false)
      expect(result.feedback).toMatch(/scan all tote slots/i)
    })

    it("allows CTRL+E when exactly 9 totes are scanned", () => {
      const session = startSessionWithTasks(
        "user-test",
        makeScenario(),
        [],
        makeCart()
      )
      let s = advanceThroughBuildCartMenus(session)
      s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session

      for (let slot = 1; slot <= 9; slot++) {
        s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session
        s = dispatch(s, { type: "SCAN", value: s.toteStack[0] }).session
      }

      const { session: built, result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+E" })
      expect(result.success).toBe(true)
      // Per §5.1.15 CTRL+E is the moment the cart becomes active.
      expect(built.cart.isBuilt).toBe(true)
      expect(built.toteStack).toHaveLength(0)
    })
  })

  describe("CTRL+A blocked when End Of Tote not displayed", () => {
    it("blocks CTRL+A at PK_SCAN_ITEM_UPC step", () => {
      const task = makePickTask()
      let s = makePickPhaseSession([task])
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

      expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)

      const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+A" })
      expect(result.success).toBe(false)
      expect(result.feedback).toMatch(/no tote completion pending/i)
    })

    it("blocks CTRL+A at PK_SCAN_TOTE_BARCODE step", () => {
      const task = makePickTask()
      let s = makePickPhaseSession([task])
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
      s = dispatch(s, { type: "SCAN", value: task.item.upcBarcode }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PICK_QUANTITY }).session
      s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_IN_TOTE }).session
      s = dispatch(s, { type: "TYPE", text: "1" }).session
      expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_TOTE_BARCODE)

      const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+A" })
      expect(result.success).toBe(false)
      expect(result.feedback).toMatch(/no tote completion pending/i)
    })

    it("allows CTRL+A when at PK_END_OF_TOTE_DISPLAY", () => {
      const task = makePickTask()
      let s = makePickPhaseSession([task])
      s = runThroughOnePick(s, task)

      expect(s.currentStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)

      const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+A" })
      expect(result.success).toBe(true)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. WRONG SCAN SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

describe("Wrong item scan returns WRONG_ITEM and does not advance state", () => {
  it("wrong UPC at PK_SCAN_ITEM_UPC → WRONG_ITEM, stays at exception step", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

    expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)

    const { session: afterError, result } = dispatch(s, {
      type: "SCAN",
      value: "WRONG-BARCODE-XYZ",
    })

    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_ITEM)
    // State advances to the exception step, not the normal next step
    expect(afterError.currentStep).not.toBe(WorkflowStep.PK_PICK_QUANTITY)
    expect(afterError.errors).toHaveLength(1)
    expect(afterError.errors[0].errorType).toBe(ScanResult.WRONG_ITEM)
  })

  it("wrong item scan is logged as a ScanEvent with WRONG_ITEM result", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

    const { session: afterError } = dispatch(s, {
      type: "SCAN",
      value: "WRONG-BARCODE-XYZ",
    })

    expect(afterError.scanEvents).toHaveLength(1)
    expect(afterError.scanEvents[0].result).toBe(ScanResult.WRONG_ITEM)
    expect(afterError.scanEvents[0].scannedValue).toBe("WRONG-BARCODE-XYZ")
    expect(afterError.scanEvents[0].expectedValue).toBe(task.item.upcBarcode)
  })

  it("correct UPC after wrong scan succeeds (re-scan allowed)", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

    // First: wrong scan
    s = dispatch(s, { type: "SCAN", value: "WRONG-UPC" }).session
    expect(s.errors).toHaveLength(1)

    // Re-navigate to item scan step (exception resolution → back to scan)
    // For this test, manually reset to item scan step to test re-scan
    s = { ...s, currentStep: WorkflowStep.PK_SCAN_ITEM_UPC }

    // Correct scan
    const { result } = dispatch(s, {
      type: "SCAN",
      value: task.item.upcBarcode,
    })
    expect(result.success).toBe(true)
    expect(result.scanResult).toBe(ScanResult.SUCCESS)
  })
})

describe("Tote scan validation at PK_SCAN_TOTE_BARCODE and BC_SCAN_TOTE_BARCODE", () => {
  it("wrong tote barcode at PK_SCAN_TOTE_BARCODE → WRONG_TOTE (strict target tote)", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
    s = dispatch(s, { type: "SCAN", value: task.item.upcBarcode }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PICK_QUANTITY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_IN_TOTE }).session
    s = dispatch(s, { type: "TYPE", text: "1" }).session

    expect(s.currentStep).toBe(WorkflowStep.PK_SCAN_TOTE_BARCODE)

    const { session: afterError, result } = dispatch(s, {
      type: "SCAN",
      value: "WRONG-TOTE-BARCODE",
    })

    // Per BBWD-WI-030 §5.2.13, scan must match the tote shown on RF Device.
    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_TOTE)
    expect(afterError.errors).toHaveLength(1)
  })

  it("empty tote scan value at PK_SCAN_TOTE_BARCODE → WRONG_TOTE", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
    s = dispatch(s, { type: "SCAN", value: task.item.upcBarcode }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PICK_QUANTITY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_IN_TOTE }).session
    s = dispatch(s, { type: "TYPE", text: "1" }).session

    // Empty scan is rejected — the simulator blocks empty dispatches in the UI,
    // but the engine itself should also return WRONG_TOTE for an empty barcode.
    const { session: afterEmpty, result: emptyResult } = dispatch(s, {
      type: "SCAN",
      value: "",
    })
    expect(emptyResult.success).toBe(false)
    expect(emptyResult.scanResult).toBe(ScanResult.WRONG_TOTE)
    // Engine routes to EX_INCORRECT_TOTE on a WRONG_TOTE scan (per §6.4)
    expect(afterEmpty.currentStep).toBe(WorkflowStep.EX_INCORRECT_TOTE)
  })

  it("a tote that is not on the stack at BC_SCAN_TOTE_BARCODE → WRONG_TOTE", () => {
    const session = startSessionWithTasks("user-test", makeScenario(), [], makeCart())
    let s = advanceThroughBuildCartMenus(session)
    s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session

    expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_TOTE_BARCODE)

    // Only totes the picker actually obtained (§5.1.4) can be scanned into a slot.
    const { result } = dispatch(s, { type: "SCAN", value: "WRONG-TOTE-000" })
    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_TOTE)
  })

  it("re-scanning an already-assigned tote → TOTE_ALLOCATED (§6.1)", () => {
    const session = startSessionWithTasks("user-test", makeScenario(), [], makeCart())
    let s = advanceThroughBuildCartMenus(session)
    s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session

    const firstTote = s.toteStack[0]
    s = dispatch(s, { type: "SCAN", value: firstTote }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session

    // Slot 1 already holds this tote — scanning it again is the §6.1 exception.
    const { result } = dispatch(s, { type: "SCAN", value: firstTote })
    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.TOTE_ALLOCATED)
  })

  it("a cart barcode that is not the assigned cart → WRONG_ITEM", () => {
    const session = startSessionWithTasks("user-test", makeScenario(), [], makeCart())
    let s = advanceThroughBuildCartMenus(session)

    expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_CART_BARCODE)

    const { result } = dispatch(s, { type: "SCAN", value: "C999999999" })
    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_ITEM)
  })

  it("scanning any tote off the stack fills the slot the RF Device named", () => {
    const session = startSessionWithTasks("user-test", makeScenario(), [], makeCart())
    let s = advanceThroughBuildCartMenus(session)
    s = dispatch(s, { type: "SCAN", value: s.cart.cartBarcode }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_PLACE_TOTE_IN_SLOT }).session

    // Per §5.1.13 the RF names the SLOT and the picker scans whichever tote
    // they grabbed — so a tote from the middle of the stack is equally valid.
    const grabbed = s.toteStack[4]
    const { session: after, result } = dispatch(s, { type: "SCAN", value: grabbed })

    expect(result.success).toBe(true)
    expect(after.cart.totes[0].barcode).toBe(grabbed)
    expect(after.toteStack).not.toContain(grabbed)
    expect(after.toteStack).toHaveLength(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. CURRENT SCREEN OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

describe("getCurrentScreen output", () => {
  it("returns BC_SCAN_CART_BARCODE screen at that step", () => {
    const session = startSessionWithTasks("u", makeScenario(), [], makeCart())
    let s = advanceThroughBuildCartMenus(session)
    const screen = getCurrentScreen(s)
    expect(screen.workflowStep).toBe(WorkflowStep.BC_SCAN_CART_BARCODE)
    expect(screen.inputType).toBe("BARCODE")
    const cursorLine = screen.lines.find((l) => l.isCursorField)
    expect(cursorLine).toBeDefined()
  })

  it("returns PK_END_OF_TOTE_DISPLAY screen with 'End Of Tote' text", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)

    expect(s.currentStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)
    const screen = getCurrentScreen(s)
    expect(screen.workflowStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)
    const endOfToteLine = screen.lines.find((l) => l.value === "End Of Tote")
    expect(endOfToteLine).toBeDefined()
  })

  it("returns PK_SCAN_ITEM_UPC screen with highlighted location", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

    const screen = getCurrentScreen(s)
    expect(screen.workflowStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)
    expect(screen.inputType).toBe("BARCODE")
    const locationLine = screen.lines.find((l) => l.isHighlighted)
    expect(locationLine?.value).toBe(task.location.displayLabel)
  })

  it("BC_LOGIN_RF screen has NUMERIC input type (renders text input via TYPE mode)", () => {
    let s = startSessionWithTasks("u", makeScenario(), [], makeCart())
    // Session starts at BC_TRAVEL_TO_COMMAND_CENTER — advance to BC_LOGIN_RF
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_RECEIVE_TOTE_COUNT }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_OBTAIN_CART }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_LOAD_TOTES }).session
    const screen = getCurrentScreen(s)
    expect(screen.workflowStep).toBe(WorkflowStep.BC_LOGIN_RF)
    expect(screen.inputType).toBe("NUMERIC")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. SCORING
// ─────────────────────────────────────────────────────────────────────────────

describe("calculateScore", () => {
  it("returns 100 accuracy score when all scans succeed", () => {
    const task = makePickTask()
    const scenario = makeScenario()
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)
    s = {
      ...s,
      totalTimeMs: 60_000, // 1 minute
      completedPicks: [
        {
          pickTaskId: task.pickTaskId,
          item: task.item,
          quantityPicked: 1,
          scannedAt: new Date(),
        },
      ],
    }

    const score = calculateScore(s, scenario)
    expect(score.accuracyScore).toBe(100)
    expect(score.errorCount).toBe(0)
    expect(score.totalPicks).toBe(1)
  })

  it("returns lower accuracy score when errors occurred", () => {
    const task = makePickTask()
    const scenario = makeScenario()
    let s = makePickPhaseSession([task])

    // Navigate to item scan step
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session

    // One wrong scan, then correct
    s = dispatch(s, { type: "SCAN", value: "WRONG-UPC" }).session
    s = { ...s, currentStep: WorkflowStep.PK_SCAN_ITEM_UPC }
    s = dispatch(s, { type: "SCAN", value: task.item.upcBarcode }).session
    s = { ...s, totalTimeMs: 60_000 }

    const score = calculateScore(s, scenario)
    // 1 correct out of 2 total scans = 50% accuracy
    expect(score.accuracyScore).toBe(50)
    expect(score.correctFirstScanRate).toBeCloseTo(0.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. ERROR INJECTION AND EXCEPTION RESOLUTION PATHS
// Per BBWD-WI-030 §6 and SIMULATION.md §Error Injection System
// ─────────────────────────────────────────────────────────────────────────────

describe("Error injection system", () => {
  it("injection fires at configured pick index even when correct UPC is scanned", () => {
    // Z1_20_PICKS has WRONG_ITEM injection at pick index 7
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    const s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    // Scanning the CORRECT UPC still fails because injection overrides it
    const correctUpc = pickQueue[7].item.upcBarcode
    const { result } = dispatch(s, { type: "SCAN", value: correctUpc }, scenario)

    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_ITEM)
  })

  it("injection overrides both wrong and correct UPC — same error result regardless", () => {
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    const s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    const { result: r1 } = dispatch(
      s,
      { type: "SCAN", value: "RANDOM-WRONG-BARCODE" },
      scenario
    )
    const { result: r2 } = dispatch(
      s,
      { type: "SCAN", value: pickQueue[7].item.upcBarcode },
      scenario
    )

    expect(r1.scanResult).toBe(ScanResult.WRONG_ITEM)
    expect(r2.scanResult).toBe(ScanResult.WRONG_ITEM)
  })
})

describe("Exception resolution: WRONG_ITEM (last at location) — §6.5.1", () => {
  it("routes: EX_INVALID_ITEM_LAST → notify lead → CTRL+K → conveyor → amnesty bin → corrected", () => {
    // Z1_20_PICKS: WRONG_ITEM at pick 7, isLastItemAtLocation: true
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    // Trigger injection → EX_INVALID_ITEM_LAST (isLastItemAtLocation = true)
    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    expect(s.currentStep).toBe(WorkflowStep.EX_INVALID_ITEM_LAST)
    expect(s.errors).toHaveLength(1)
    expect(s.errors[0].isLastItemAtLocation).toBe(true)

    // Step 1: Acknowledge error → Notify Lead
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_INVALID_ITEM_LAST }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_NOTIFY_LEAD)

    // Step 2: Lead notified → prompt to press CTRL+K
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_NOTIFY_LEAD }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_PRESS_CTRL_K)

    // Step 3: CTRL+K with active WRONG_ITEM error → tote to conveyor
    // Per BBWD-WI-030 §6.5.1: CTRL+K routes to PK_PLACE_TOTE_ON_CONVEYOR for WRONG_ITEM
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR)

    // Step 4: Place tote on conveyor → Amnesty Bin (because isLastItemAtLocation = true)
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_ITEM_TO_AMNESTY_BIN)

    // Step 5: Place item in amnesty bin → error corrected, back to pick display
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_ITEM_TO_AMNESTY_BIN }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)
    expect(s.errors[0].corrected).toBe(true)
  })
})

describe("Exception resolution: SHORT_INVENTORY (ITEM_NOT_FOUND) — §6.6", () => {
  it("routes: EX_SHORT_INVENTORY → notify lead → CTRL+K → skip pick → corrected", () => {
    // Z1_20_PICKS: ITEM_NOT_FOUND at pick 15
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 15,
    }

    // Trigger injection → EX_SHORT_INVENTORY
    s = dispatch(s, { type: "SCAN", value: pickQueue[15].item.upcBarcode }, scenario).session
    expect(s.currentStep).toBe(WorkflowStep.EX_SHORT_INVENTORY)
    expect(s.errors[0].errorType).toBe(ScanResult.ITEM_NOT_FOUND)

    // Step 1: Verify location (confirm) → Notify Lead
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_SHORT_INVENTORY }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_NOTIFY_LEAD)

    // Step 2: Lead notified → prompt to press CTRL+K
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_NOTIFY_LEAD }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_PRESS_CTRL_K)

    // Step 3: CTRL+K with ITEM_NOT_FOUND → marks corrected, skips to next pick display
    // Per BBWD-WI-030 §6.6: CTRL+K skips the pick and continues
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)
    expect(s.errors[0].corrected).toBe(true)
  })
})

describe("Advanced scoring", () => {
  it("score formula: (accuracy × 0.6) + (speed × 0.4) verified with explicit target", () => {
    const task = makePickTask()
    // 60 picks/hr target; 30 picks in 30 min = 60/hr → speed 100%; all scans correct
    const scenario = makeScenario({ targetPicksPerHour: 60 })
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)
    s = {
      ...s,
      totalTimeMs: 30 * 60_000, // 30 minutes
      completedPicks: Array.from({ length: 30 }, (_, i) => ({
        pickTaskId: `fp${i}`,
        item: task.item,
        quantityPicked: 1,
        scannedAt: new Date(),
      })),
    }

    const score = calculateScore(s, scenario)
    // 30 picks / 0.5 hr = 60/hr, target = 60 → speedScore = 100
    // All scans correct → accuracyScore = 100
    // finalScore = Math.round(100 × 0.6 + 100 × 0.4) = 100
    expect(score.accuracyScore).toBe(100)
    expect(score.speedScore).toBe(100)
    expect(score.finalScore).toBe(100)
  })

  it("score returns 0 safely with no scans and no elapsed time (divide-by-zero guard)", () => {
    const scenario = makeScenario()
    // Session with no picks — empty pick queue, no scan events, no totalTimeMs
    const s = makePickPhaseSession([])

    const score = calculateScore(s, scenario)
    expect(score.accuracyScore).toBe(0)
    expect(score.speedScore).toBe(0)
    expect(score.finalScore).toBe(0)
    expect(score.totalPicks).toBe(0)
    expect(score.correctFirstScanRate).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. ADDITIONAL ERROR INJECTION TESTS
// Per SIMULATION.md §Error Injection System
// ─────────────────────────────────────────────────────────────────────────────

describe("Error injection: re-injection guard", () => {
  it("same injected error does not fire twice at the same pick index", () => {
    // Z1_20_PICKS has WRONG_ITEM injection at pick 7.
    // After the first injection the error is recorded in session.errors with
    // injected=true and pickIndex=7. The guard must prevent a second injection.
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })

    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    // First scan: injection fires — WRONG_ITEM even with correct UPC
    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    expect(s.errors).toHaveLength(1)
    expect(s.errors[0].injected).toBe(true)
    // pickIndex must be stored so the guard can identify the spent scenario
    expect(s.errors[0].pickIndex).toBe(7)

    // Simulate retry: go back to the same PK_SCAN_ITEM_UPC step at the same index
    s = { ...s, currentStep: WorkflowStep.PK_SCAN_ITEM_UPC, currentPickIndex: 7 }

    // Second scan: guard suppresses injection → correct UPC now succeeds
    const { result } = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario)
    expect(result.success).toBe(true)
    expect(result.scanResult).toBe(ScanResult.SUCCESS)
    // Still only 1 injected error (not 2)
    expect(dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session.errors).toHaveLength(1)
  })

  it("session with all error scenarios out-of-range passes through without injection", () => {
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_10_PICKS
    const noInjectScenario = {
      ...scenario,
      errorScenarios: scenario.errorScenarios.map((error, index) => ({
        ...error,
        injectAtPickIndex: 98 + index,
      })),
    }
    const base = startSessionWithTasks("user-test", noInjectScenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })

    const s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 0,
    }

    // Scanning correct UPC at pick 0 should succeed — no injection active
    const { result } = dispatch(
      s,
      { type: "SCAN", value: pickQueue[0].item.upcBarcode },
      noInjectScenario
    )
    expect(result.success).toBe(true)
    expect(result.scanResult).toBe(ScanResult.SUCCESS)
    expect(result.newStep).toBe(WorkflowStep.PK_PICK_QUANTITY)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. CTRL+K ACCEPTANCE ON EX_INVALID_ITEM_LAST + OUT-OF-ORDER REJECTION
// The EX_INVALID_ITEM_LAST screen displays "Press CTRL+K to skip" so ^K must
// be accepted there. CTRL+K is still rejected from EX_NOTIFY_LEAD (no transition).
// Per BBWD-WI-030 §6.5.1 and §6 Sequence Enforcement
// ─────────────────────────────────────────────────────────────────────────────

describe("Exception resolution: out-of-order step rejection", () => {
  it("^K accepted on EX_INVALID_ITEM_LAST step", () => {
    // The screen says "Press CTRL+K to skip" — ^K must succeed here.
    // Per BBWD-WI-030 §6.5.1 and the fix for the P1 ^K bug.
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })

    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    // Trigger injection → session lands at EX_INVALID_ITEM_LAST
    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    expect(s.currentStep).toBe(WorkflowStep.EX_INVALID_ITEM_LAST)

    // ^K must succeed — the screen says "Press CTRL+K"
    const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" })
    expect(result.success).toBe(true)
  })

  it("EX_INVALID_ITEM_LAST → PK_PLACE_TOTE_ON_CONVEYOR after ^K (WRONG_ITEM active error)", () => {
    // WRONG_ITEM active error → dynamic CTRL+K routing sends to PK_PLACE_TOTE_ON_CONVEYOR.
    // Per BBWD-WI-030 §6.5.1: invalid item (last) requires tote to Putwall.
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })

    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    expect(s.currentStep).toBe(WorkflowStep.EX_INVALID_ITEM_LAST)

    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR)
  })

  it("CTRL+K from EX_NOTIFY_LEAD is rejected (must CONFIRM lead notification first)", () => {
    // At EX_NOTIFY_LEAD the only valid action is CONFIRM → EX_PRESS_CTRL_K.
    // Pressing CTRL+K (KEY_PRESS) directly from EX_NOTIFY_LEAD must fail because
    // EX_NOTIFY_LEAD has no KEY_PRESS transitions — only CONFIRM.
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })

    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }

    // Trigger injection → acknowledge error → now at EX_NOTIFY_LEAD
    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_INVALID_ITEM_LAST }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_NOTIFY_LEAD)

    // Attempt CTRL+K from EX_NOTIFY_LEAD — must fail (no KEY_PRESS transition there)
    const { result } = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" })
    expect(result.success).toBe(false)
    // Step must not advance
    expect(s.currentStep).toBe(WorkflowStep.EX_NOTIFY_LEAD)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADDITIONAL SCORING TESTS
// Verifies pass/fail boundary and accuracy-vs-speed weighting.
// Per CLAUDE.md §Simulations: (accuracy × 0.6) + (speed × 0.4)
// ─────────────────────────────────────────────────────────────────────────────

describe("Scoring: accuracy/speed weighting, pass/fail boundary", () => {
  it("high accuracy + very slow speed produces correctly weighted composite score", () => {
    const task = makePickTask()
    // targetPicksPerHour = 100; completedPicks = 5; totalTimeMs = 1 hr
    // → actualPicksPerHour = 5; speedScore = Math.round(5/100 × 100) = 5
    // → accuracyScore = 100 (all scans in runThroughOnePick succeed)
    // → finalScore = Math.round(100 × 0.6 + 5 × 0.4) = 62
    const scenario = makeScenario({ targetPicksPerHour: 100 })
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)
    s = {
      ...s,
      totalTimeMs: 60 * 60_000, // 1 hour
      completedPicks: Array.from({ length: 5 }, (_, i) => ({
        pickTaskId: `p${i}`,
        item: task.item,
        quantityPicked: 1,
        scannedAt: new Date(),
      })),
    }

    const score = calculateScore(s, scenario)
    expect(score.accuracyScore).toBe(100)
    expect(score.speedScore).toBe(5) // Math.round(5/100 × 100)
    expect(score.finalScore).toBe(Math.round(100 * 0.6 + 5 * 0.4)) // 62
  })

  it("finalScore strictly below minScore → passed is false", () => {
    // Empty session: 0 scans → accuracyScore = 0; 0 picks → speedScore = 0
    // finalScore = 0; minScore = 70 → passed = false
    const scenario = makeScenario({ passCriteria: { minScore: 70, maxErrors: 5 } })
    const s = makePickPhaseSession([])
    const score = calculateScore(s, scenario)
    expect(score.finalScore).toBe(0)
    expect(score.passed).toBe(false)
  })

  it("finalScore at exactly minScore → passed is true", () => {
    // runThroughOnePick gives 2 SUCCESS scans → accuracyScore = 100
    // completedPicks stripped → speedScore = 0 (no picks / any time = 0)
    // finalScore = Math.round(100 × 0.6 + 0 × 0.4) = 60
    // minScore = 60 → 60 >= 60 → passed = true
    const scenario = makeScenario({ passCriteria: { minScore: 60, maxErrors: 5 } })
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)
    s = {
      ...s,
      totalTimeMs: 24 * 60 * 60_000, // 24 h → actualPicksPerHour = 0/24 = 0
      completedPicks: [], // strip so speedScore = 0
    }

    const score = calculateScore(s, scenario)
    expect(score.speedScore).toBe(0)
    expect(score.accuracyScore).toBe(100)
    const expectedFinal = Math.round(100 * 0.6 + 0 * 0.4) // 60
    expect(score.finalScore).toBe(expectedFinal)
    expect(score.passed).toBe(true) // 60 >= 60
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 11. ADDITIONAL SCREEN GENERATOR TESTS
// Verifies exact field layout for key screens.
// Per SIMULATION.md §RF Device Screen Generator and BBWD-VJA-030
// ─────────────────────────────────────────────────────────────────────────────

describe("Screen generator: PK_SCAN_ITEM_UPC exact field layout", () => {
  /** Advance to PK_SCAN_ITEM_UPC in a one-task pick-phase session. */
  function sessionAtItemScanStep(task: PickTask): SimulationSession {
    let s = makePickPhaseSession([task])
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
    return s
  }

  it("Aloc line has isHighlighted: true", () => {
    const task = makePickTask()
    const screen = getCurrentScreen(sessionAtItemScanStep(task))
    const alocLine = screen.lines.find((l) => l.label === "Aloc:")
    expect(alocLine?.isHighlighted).toBe(true)
  })

  it("Item Barcode line has isCursorField: true", () => {
    const task = makePickTask()
    const screen = getCurrentScreen(sessionAtItemScanStep(task))
    const cursorLine = screen.lines.find((l) => l.isCursorField)
    expect(cursorLine).toBeDefined()
    expect(cursorLine?.label).toBe("Item Barcode:")
  })

  it("screen reflects live session data — location, SKU, and tote ID from current pick", () => {
    // Use a unique location/item to confirm the screen is NOT returning stale data
    const item = makeItem({ sku: "LIVE-SKU-TEST", lastFourDigits: "9999" })
    const location = makeLocation({ displayLabel: "512-007-B2" })
    const task = makePickTask({ item, location })

    const s = sessionAtItemScanStep(task)
    const screen = getCurrentScreen(s)

    expect(screen.workflowStep).toBe(WorkflowStep.PK_SCAN_ITEM_UPC)
    expect(screen.inputType).toBe("BARCODE")

    const alocLine = screen.lines.find((l) => l.label === "Aloc:")
    expect(alocLine?.value).toBe("512-007-B2")

    const itemLine = screen.lines.find((l) => l.label === "Item:")
    expect(itemLine?.value).toBe("LIVE-SKU-TEST")
  })
})

describe("Screen generator: PK_END_OF_TOTE_DISPLAY", () => {
  it("returns inputType: KEYBOARD_SHORTCUT", () => {
    // KEYBOARD_SHORTCUT signals that the only valid input is a soft key press.
    // Per task spec and BBWD-WI-030 §5.2.14
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)

    expect(s.currentStep).toBe(WorkflowStep.PK_END_OF_TOTE_DISPLAY)
    const screen = getCurrentScreen(s)
    expect(screen.inputType).toBe("KEYBOARD_SHORTCUT")
  })

  it("activeField is CTRL+A (soft key bar must highlight CTRL+A button)", () => {
    const task = makePickTask()
    let s = makePickPhaseSession([task])
    s = runThroughOnePick(s, task)

    const screen = getCurrentScreen(s)
    expect(screen.activeField).toBe("CTRL+A")
  })
})

describe("Screen generator: no WorkflowStep causes generateScreen to throw", () => {
  it("every WorkflowStep produces a valid screen without throwing", () => {
    // Build a session with at least one pick task so pick/tote lookups have data
    const task = makePickTask()
    const baseSession = makePickPhaseSession([task])
    const allSteps = Object.values(WorkflowStep)

    for (const step of allSteps) {
      // Must never throw for any step
      expect(() =>
        getCurrentScreen({ ...baseSession, currentStep: step as WorkflowStep })
      ).not.toThrow()
    }

    // Every generated screen must carry a screenId and the matching workflowStep
    for (const step of allSteps) {
      const screen = getCurrentScreen({ ...baseSession, currentStep: step as WorkflowStep })
      expect(screen.screenId).toBeTruthy()
      expect(screen.workflowStep).toBe(step)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fast-forward a session from BC_LOGIN_RF through menu navigation to
 * BC_SCAN_CART_BARCODE (skipping past all menu TYPE/KEY_PRESS steps).
 */
function advanceThroughBuildCartMenus(
  session: SimulationSession
): SimulationSession {
  let s = session
  // Pre-login physical steps (BC_TRAVEL_TO_COMMAND_CENTER → BC_LOGIN_RF)
  // Added in Phase 3 FIX 2 — session now starts here instead of BC_LOGIN_RF.
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_TRAVEL_TO_COMMAND_CENTER }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_RECEIVE_TOTE_COUNT }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_OBTAIN_CART }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.BC_LOAD_TOTES }).session
  s = dispatch(s, { type: "TYPE", text: "testuser" }).session // BC_LOGIN_RF
  s = dispatch(s, { type: "TYPE", text: "1" }).session // BC_SELECT_BBWD
  s = dispatch(s, { type: "TYPE", text: "2" }).session // BC_SELECT_OUTBOUND
  s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+T" }).session
  s = dispatch(s, { type: "KEY_PRESS", keys: "ENTER+ENTER" }).session
  s = dispatch(s, { type: "SCAN", value: s.cart.taskGroup }).session // zone scan
  s = dispatch(s, { type: "TYPE", text: "1" }).session // BC_SELECT_MAKE_TOTE_CART
  return s
}

/**
 * Run through all steps of a single pick task from PK_READ_PICK_DISPLAY
 * to PK_END_OF_TOTE_DISPLAY (the last step before CTRL+A).
 */
function runThroughOnePick(
  session: SimulationSession,
  task: PickTask
): SimulationSession {
  let s = session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_READ_PICK_DISPLAY }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_TRAVEL_TO_LOCATION }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_LOCATION }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_VERIFY_ITEM }).session
  s = dispatch(s, { type: "SCAN", value: task.item.upcBarcode }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PICK_QUANTITY }).session
  s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.PK_PLACE_IN_TOTE }).session
  s = dispatch(s, { type: "TYPE", text: "1" }).session
  // Use session state for tote barcode — never hardcode
  s = dispatch(s, { type: "SCAN", value: s.cart.totes[task.targetSlot - 1].barcode }).session
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// PICK COUNTER TESTS — Bug 6 regression coverage
// ─────────────────────────────────────────────────────────────────────────────

describe("Pick counter advancement", () => {
  it("advances currentPickIndex after completing a successful pick", () => {
    const task = makePickTask({ targetSlot: 1 })
    let s = makePickPhaseSession([task, makePickTask({ targetSlot: 2 })])
    expect(s.currentPickIndex).toBe(0)
    s = runThroughOnePick(s, task)
    // After a full pick cycle the index should have moved to 1
    expect(s.currentPickIndex).toBe(1)
  })

  it("advances currentPickIndex after CTRL+K skip on ITEM_NOT_FOUND (§6.6)", () => {
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    // Fast-forward to the point just before CTRL+K: EX_PRESS_CTRL_K with active ITEM_NOT_FOUND
    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 15,
    }
    s = dispatch(s, { type: "SCAN", value: pickQueue[15].item.upcBarcode }, scenario).session
    // Injection fires → EX_SHORT_INVENTORY
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_SHORT_INVENTORY }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_NOTIFY_LEAD }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_PRESS_CTRL_K)

    const pickIndexBefore = s.currentPickIndex

    // CTRL+K should skip the pick and advance the counter
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)
    expect(s.currentPickIndex).toBe(pickIndexBefore + 1)
    expect(s.errors[0].corrected).toBe(true)
  })

  it("advances currentPickIndex after CTRL+K skip on WRONG_ITEM last-at-location (§6.5.1)", () => {
    const { scenario, pickQueue, cart } = SCENARIO_DATA.Z1_20_PICKS
    const base = startSessionWithTasks("user-test", scenario, pickQueue, {
      ...cart,
      isBuilt: true,
    })
    let s: SimulationSession = {
      ...base,
      currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
      currentPickIndex: 7,
    }
    // Trigger WRONG_ITEM injection (pick 7 in Z1_20_PICKS)
    s = dispatch(s, { type: "SCAN", value: pickQueue[7].item.upcBarcode }, scenario).session
    expect(s.currentStep).toBe(WorkflowStep.EX_INVALID_ITEM_LAST)

    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_INVALID_ITEM_LAST }).session
    s = dispatch(s, { type: "CONFIRM", step: WorkflowStep.EX_NOTIFY_LEAD }).session
    expect(s.currentStep).toBe(WorkflowStep.EX_PRESS_CTRL_K)

    const pickIndexBefore = s.currentPickIndex

    // CTRL+K on WRONG_ITEM → PK_PLACE_TOTE_ON_CONVEYOR and index advances
    s = dispatch(s, { type: "KEY_PRESS", keys: "CTRL+K" }).session
    expect(s.currentStep).toBe(WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR)
    expect(s.currentPickIndex).toBe(pickIndexBefore + 1)
  })
})
