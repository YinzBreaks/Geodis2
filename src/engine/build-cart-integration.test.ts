/**
 * build-cart-integration.test.ts — full Build Cart → Pick round walkthrough
 *
 * Drives a real seeded scenario end to end through the canonical input pipeline
 * (`processInput`), exactly as the UI does, and asserts that the workflow
 * actually mutates cart state rather than only advancing a step counter.
 *
 * This exists because Build Cart previously shipped with `isBuilt: true` and all
 * nine tote barcodes pre-assigned, so scanning a cart or a tote changed nothing
 * and could not fail. Every unit test still passed. A test that walks the whole
 * round is the only thing that catches that class of bug.
 */

import { describe, expect, it } from "vitest"
import { SCENARIO_DATA } from "@/data/seedData"
import { startSessionWithTasks } from "@/engine/simulation-engine"
import { processInput } from "@/engine/process-input"
import { WorkflowStep, ScanResult, type SimulationSession } from "@/types/domain"

const BUNDLE = SCENARIO_DATA.Z1_10_PICKS

function freshSession(): SimulationSession {
  return startSessionWithTasks(
    "trainee-test",
    BUNDLE.scenario,
    BUNDLE.pickQueue,
    BUNDLE.cart
  )
}

/** Dispatch one canonical input, mirroring what the UI sends. */
function send(
  session: SimulationSession,
  type: "SCAN" | "CONFIRM" | "QUANTITY" | "SOFTKEY",
  value = ""
) {
  return processInput(session, { type, value, source: "click" }, BUNDLE.scenario)
}

/** Walk the Build Cart menu steps up to the cart barcode scan. */
function advanceToCartScan(session: SimulationSession): SimulationSession {
  let s = session
  const drive: Array<["SCAN" | "CONFIRM" | "QUANTITY" | "SOFTKEY", string]> = [
    ["CONFIRM", ""], // BC_TRAVEL_TO_COMMAND_CENTER
    ["CONFIRM", ""], // BC_RECEIVE_TOTE_COUNT
    ["CONFIRM", ""], // BC_OBTAIN_CART
    ["CONFIRM", ""], // BC_LOAD_TOTES
    ["QUANTITY", "picker1"], // BC_LOGIN_RF
    ["QUANTITY", "1"], // BC_SELECT_BBWD
    ["QUANTITY", "2"], // BC_SELECT_OUTBOUND
    ["SOFTKEY", "CTRL+T"], // BC_PRESS_CTRL_T
    ["SOFTKEY", "ENTER"], // BC_CONFIRM_TASK_GROUP (ENTER+ENTER)
    ["SCAN", BUNDLE.cart.taskGroup], // BC_SCAN_ZONE_TASK_GROUP
    ["QUANTITY", "1"], // BC_SELECT_MAKE_TOTE_CART
  ]
  for (const [type, value] of drive) {
    s = send(s, type, value).session
  }
  return s
}

describe("Build Cart actually assembles the cart", () => {
  it("starts unbuilt with nine empty slots and a full tote stack", () => {
    const s = freshSession()

    expect(s.cart.isBuilt).toBe(false)
    expect(s.cart.totes).toHaveLength(9)
    expect(s.cart.totes.every((t) => t.barcode === "")).toBe(true)
    expect(s.toteStack).toHaveLength(9)
  })

  it("reaches the cart scan and rejects the wrong cart", () => {
    const s = advanceToCartScan(freshSession())
    expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_CART_BARCODE)

    const { result } = send(s, "SCAN", "C999999999")
    expect(result.success).toBe(false)
    expect(result.scanResult).toBe(ScanResult.WRONG_ITEM)
  })

  it("fills every slot from the stack and finalizes with CTRL+E", () => {
    let s = advanceToCartScan(freshSession())
    s = send(s, "SCAN", s.cart.cartBarcode).session

    for (let slot = 1; slot <= 9; slot++) {
      s = send(s, "CONFIRM").session
      expect(s.currentStep).toBe(WorkflowStep.BC_SCAN_TOTE_BARCODE)

      // The UI scans whichever tote is on top of the stack (§5.1.13).
      const grabbed = s.toteStack[0]
      const stackBefore = s.toteStack.length
      const { session: next, result } = send(s, "SCAN", grabbed)

      expect(result.success).toBe(true)
      expect(next.cart.totes[slot - 1].barcode).toBe(grabbed)
      expect(next.toteStack).toHaveLength(stackBefore - 1)
      s = next
    }

    expect(s.toteStack).toHaveLength(0)
    expect(s.cart.totes.every((t) => t.barcode.length > 0)).toBe(true)

    const built = send(s, "SOFTKEY", "CTRL+E").session
    expect(built.cart.isBuilt).toBe(true)
    expect(built.currentStep).toBe(WorkflowStep.PK_READ_PICK_DISPLAY)
  })

  it("blocks CTRL+E until every slot holds a tote", () => {
    let s = advanceToCartScan(freshSession())
    s = send(s, "SCAN", s.cart.cartBarcode).session

    // Assign only four of the nine slots.
    for (let slot = 1; slot <= 4; slot++) {
      s = send(s, "CONFIRM").session
      s = send(s, "SCAN", s.toteStack[0]).session
    }

    const { result } = send(s, "SOFTKEY", "CTRL+E")
    expect(result.success).toBe(false)
    expect(result.feedback).toMatch(/scan all tote slots/i)
  })
})

describe("a full round reaches PS_ROUND_COMPLETE", () => {
  it("completes every pick and closes one tote at a time", () => {
    let s = advanceToCartScan(freshSession())
    s = send(s, "SCAN", s.cart.cartBarcode).session
    for (let slot = 1; slot <= 9; slot++) {
      s = send(s, "CONFIRM").session
      s = send(s, "SCAN", s.toteStack[0]).session
    }
    s = send(s, "SOFTKEY", "CTRL+E").session

    let endOfTote = 0
    let conveyorTrips = 0
    let guard = 0

    while (s.currentStep !== WorkflowStep.PS_ROUND_COMPLETE && guard++ < 400) {
      const step = s.currentStep
      const pick = s.pickQueue[s.currentPickIndex]

      switch (step) {
        case WorkflowStep.PK_SCAN_ITEM_UPC:
          s = send(s, "SCAN", pick.item.upcBarcode).session
          break
        case WorkflowStep.PK_ENTER_QUANTITY:
          s = send(s, "QUANTITY", String(pick.quantityRequired)).session
          break
        case WorkflowStep.PK_SCAN_TOTE_BARCODE:
          s = send(s, "SCAN", s.cart.totes[pick.targetSlot - 1].barcode).session
          break
        case WorkflowStep.PK_END_OF_TOTE_DISPLAY:
          endOfTote++
          s = send(s, "SOFTKEY", "CTRL+A").session
          break
        case WorkflowStep.PK_PLACE_TOTE_ON_CONVEYOR:
          conveyorTrips++
          s = send(s, "CONFIRM").session
          break
        case WorkflowStep.EX_PRESS_CTRL_K:
          s = send(s, "SOFTKEY", "CTRL+K").session
          break
        case WorkflowStep.EX_PRESS_CTRL_W:
          s = send(s, "SOFTKEY", "CTRL+W").session
          break
        default:
          s = send(s, "CONFIRM").session
      }

      expect(s.currentStep, `stuck at ${step}`).not.toBe(step)
    }

    expect(s.currentStep).toBe(WorkflowStep.PS_ROUND_COMPLETE)
    expect(s.currentPickIndex).toBe(BUNDLE.pickQueue.length)

    // The round fills 3 totes, so the picker walks to the conveyor 3 times —
    // NOT once per pick. One of those is the §6.5.1 CTRL+K exception path,
    // which also rails its tote to the Putwall.
    const distinctSlots = new Set(BUNDLE.pickQueue.map((p) => p.targetSlot)).size
    expect(conveyorTrips).toBe(distinctSlots)
    expect(endOfTote).toBeLessThan(BUNDLE.pickQueue.length)
  })
})
