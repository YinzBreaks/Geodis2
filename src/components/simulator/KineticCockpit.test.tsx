// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { KineticCockpit } from "./KineticCockpit"
import { WorkflowStep, DifficultyLevel, Zone } from "@/types/domain"
import type { SimulationSession } from "@/types/domain"

const MOCK_SESSION: SimulationSession = {
  sessionId: "cockpit-test-1",
  userId: "user-1",
  moduleId: "mod-1",
  status: "IN_PROGRESS",
  startedAt: new Date(),
  difficulty: DifficultyLevel.BEGINNER,
  currentStep: WorkflowStep.PK_SCAN_ITEM_UPC,
  currentPickIndex: 0,
  currentToteSlot: 1,
  toteStack: [],
  scanEvents: [],
  errors: [],
  pickQueue: [
    {
      pickTaskId: "pick-1",
      orderNumber: "ORD-001",
      quantityRequired: 2,
      location: {
        locationId: "loc-1",
        zone: Zone.Z1,
        aisle: "316",
        bay: "01",
        level: "B",
        checkDigit: "47",
        barcode: "LOC-316-01-B",
        displayLabel: "316-01-B",
      },
      item: {
        itemId: "item-1",
        sku: "SKU-TEST-1",
        upcBarcode: "012345678905",
        lastFourDigits: "8905",
        description: "Test Item Widget",
        unitOfMeasure: "Unit",
      },
      targetSlot: 3,
      targetToteId: "TOTE-03",
    },
  ],
  completedPicks: [],
  cart: {
    cartId: "CART-01",
    cartBarcode: "C000000083",
    zone: Zone.Z1,
    taskGroup: "TG-1",
    roundNumber: 1,
    totalItemsPicked: 0,
    isBuilt: true,
    totes: [
      {
        toteId: "TOTE-03",
        barcode: "TOTE-03",
        slot: 3,
        pickedItems: [],
        isComplete: false,
        placedOnConveyor: false,
      },
    ],
  },
}

describe("KineticCockpit", () => {
  it("renders grounded physical warehouse environment with mounted Symbol WT4090 terminal", () => {
    render(
      <KineticCockpit
        session={MOCK_SESSION}
        coaching={{ isVisible: false, content: null, step: null }}
        result={null}
        processInput={vi.fn()}
      />
    )

    // Cockpit brand
    expect(screen.getByText("KINETIC OS")).toBeTruthy()

    // Physical warehouse shelf signage
    expect(screen.getByText("LEVEL B WIRE DECKING")).toBeTruthy()

    // Physical Symbol WT4090 terminal mounted on right
    expect(screen.getByText("symbol")).toBeTruthy()
    expect(screen.getByText("WT4090")).toBeTruthy()
  })

  it("displays 9-tote cart target pulse and location check-digit", () => {
    render(
      <KineticCockpit
        session={MOCK_SESSION}
        coaching={{ isVisible: false, content: null, step: null }}
        result={null}
        processInput={vi.fn()}
      />
    )

    expect(screen.getByText("TARGET: SLOT 3 (TOTE-03)")).toBeTruthy()
    expect(screen.getByText("[47]")).toBeTruthy()
  })

  it("renders persistent 4-beat metronomic cadence strip in footer", () => {
    render(
      <KineticCockpit
        session={MOCK_SESSION}
        coaching={{ isVisible: false, content: null, step: null }}
        result={null}
        processInput={vi.fn()}
      />
    )

    expect(screen.getByText(/1\. LOCATION/)).toBeTruthy()
    expect(screen.getByText(/2\. SKU/)).toBeTruthy()
    expect(screen.getByText(/3\. QTY/)).toBeTruthy()
    expect(screen.getByText(/4\. TOTE/)).toBeTruthy()

    // Telemetry items
    expect(screen.getByText("Pace:")).toBeTruthy()
    expect(screen.getByText("Accuracy:")).toBeTruthy()
    expect(screen.getByText("Clock:")).toBeTruthy()
  })
})
