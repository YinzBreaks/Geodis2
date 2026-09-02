// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { KineticTerminalHUD } from "./KineticTerminalHUD"
import { WorkflowStep, DifficultyLevel, Zone } from "@/types/domain"
import type { SimulationSession, RFDeviceScreen } from "@/types/domain"

const MOCK_SESSION: SimulationSession = {
  sessionId: "sim-test-1",
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
      targetSlot: 1,
      targetToteId: "TOTE-01",
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
        toteId: "TOTE-01",
        barcode: "TOTE-01",
        slot: 1,
        pickedItems: [],
        isComplete: false,
        placedOnConveyor: false,
      },
    ],
  },
}

const MOCK_SCREEN: RFDeviceScreen = {
  screenId: "PK_ITEM",
  workflowStep: WorkflowStep.PK_SCAN_ITEM_UPC,
  lines: [
    { value: "LOC: 316-01-B" },
    { value: "SKU: SKU-TEST-1" },
    { value: "QTY: 2 Units" },
  ],
  inputType: "BARCODE",
}

describe("KineticTerminalHUD", () => {
  it("renders 20-col WMS emulation header and screen content", () => {
    render(
      <KineticTerminalHUD
        session={MOCK_SESSION}
        rfScreen={MOCK_SCREEN}
        inputValue=""
        inputMode="SCAN"
        isComplete={false}
        result={null}
        inputError={null}
        coaching={{ isVisible: false, content: null, step: null }}
        handleSubmit={vi.fn()}
        handleKeyDown={vi.fn()}
        handleSoftKey={vi.fn()}
        setInputValue={vi.fn()}
      />
    )

    expect(screen.getByText("WMS INDUSTRIAL TERMINAL")).toBeTruthy()
    expect(screen.getByText(/LOC: 316-01-B/)).toBeTruthy()
  })

  it("handles numeric keypad button clicks", () => {
    const setInputValue = vi.fn()
    render(
      <KineticTerminalHUD
        session={MOCK_SESSION}
        rfScreen={MOCK_SCREEN}
        inputValue="1"
        inputMode="TYPE"
        isComplete={false}
        result={null}
        inputError={null}
        coaching={{ isVisible: false, content: null, step: null }}
        handleSubmit={vi.fn()}
        handleKeyDown={vi.fn()}
        handleSoftKey={vi.fn()}
        setInputValue={setInputValue}
      />
    )

    const button5 = screen.getByText("5")
    fireEvent.click(button5)
    expect(setInputValue).toHaveBeenCalledWith("15")
  })

  it("fires softkey callback when exception button clicked", () => {
    const handleSoftKey = vi.fn()
    render(
      <KineticTerminalHUD
        session={MOCK_SESSION}
        rfScreen={MOCK_SCREEN}
        inputValue=""
        inputMode="SCAN"
        isComplete={false}
        result={null}
        inputError={null}
        coaching={{ isVisible: false, content: null, step: null }}
        softKeyEnabled={{ CTRL_K: true }}
        handleSubmit={vi.fn()}
        handleKeyDown={vi.fn()}
        handleSoftKey={handleSoftKey}
        setInputValue={vi.fn()}
      />
    )

    const shortBtn = screen.getByText("SHORT")
    fireEvent.click(shortBtn)
    expect(handleSoftKey).toHaveBeenCalledWith("CTRL_K")
  })

  it("fires trigger action when TRIGGER button clicked", () => {
    const onPullTrigger = vi.fn()
    render(
      <KineticTerminalHUD
        session={MOCK_SESSION}
        rfScreen={MOCK_SCREEN}
        inputValue=""
        inputMode="SCAN"
        isComplete={false}
        result={null}
        inputError={null}
        coaching={{ isVisible: false, content: null, step: null }}
        handleSubmit={vi.fn()}
        handleKeyDown={vi.fn()}
        handleSoftKey={vi.fn()}
        setInputValue={vi.fn()}
        onPullTrigger={onPullTrigger}
      />
    )

    const triggerBtn = screen.getByText("TRIGGER")
    fireEvent.click(triggerBtn)
    expect(onPullTrigger).toHaveBeenCalledTimes(1)
  })
})
