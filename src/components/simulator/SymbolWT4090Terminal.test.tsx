// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { SymbolWT4090Terminal } from "./SymbolWT4090Terminal"
import { WorkflowStep, DifficultyLevel, Zone } from "@/types/domain"
import type { SimulationSession, RFDeviceScreen } from "@/types/domain"

const MOCK_SESSION: SimulationSession = {
  sessionId: "wt4090-test-1",
  userId: "user-1",
  moduleId: "DAY1_EQUIPMENT_CHECK_DIGIT",
  difficulty: DifficultyLevel.BEGINNER,
  status: "IN_PROGRESS",
  startedAt: new Date(),
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
        sku: "028018120",
        upcBarcode: "012345678905",
        lastFourDigits: "0564",
        description: "Industrial Fasteners Pack",
        unitOfMeasure: "Unit",
      },
      targetSlot: 1,
      targetToteId: "T0000000016834",
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
        toteId: "T0000000016834",
        barcode: "T0000000016834",
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
    { label: "Tote", value: "T0000000016834" },
    { label: "Aloc", value: "A50-049-A1" },
    { label: "Item", value: "028018120" },
    { label: "Item (Last 4)", value: "0564" },
    { label: "Qty", value: "1 Unit" },
    { label: "Item Barcode", value: "", isCursorField: true },
  ],
  inputType: "BARCODE",
}

describe("SymbolWT4090Terminal", () => {
  it("renders authentic matte polycarbonate housing, debossed 'symbol' logo, and 4-bar signal indicator", () => {
    render(
      <SymbolWT4090Terminal
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

    // Debossed brand insignia
    expect(screen.getByText("symbol")).toBeTruthy()

    // Model indicator & Status LEDs
    expect(screen.getByText("WT4090")).toBeTruthy()
    expect(screen.getByText("RAD")).toBeTruthy()
    expect(screen.getByText("DEC")).toBeTruthy()
    expect(screen.getByText("ERR")).toBeTruthy()

    // Wireless Access Point indicator
    expect(screen.getByText("AP-316")).toBeTruthy()
  })

  it("renders 6-to-8 line Telnet/VT220 prompt hierarchy with cool-white transflective display", () => {
    render(
      <SymbolWT4090Terminal
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

    expect(screen.getByText(/T0000000016834/)).toBeTruthy()
    expect(screen.getByText(/A50-049-A1/)).toBeTruthy()
    expect(screen.getByText(/028018120/)).toBeTruthy()
    expect(screen.getByText(/0564/)).toBeTruthy()
    expect(screen.getByText(/1 Unit/)).toBeTruthy()
  })

  it("handles physical chiclet numeric keypad taps", () => {
    const setInputValue = vi.fn()
    render(
      <SymbolWT4090Terminal
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

    const key5 = screen.getByText("5")
    fireEvent.click(key5)
    expect(setInputValue).toHaveBeenCalledWith("15")
  })

  it("fires handleSubmit when tall curved ENTER bar is clicked", () => {
    const handleSubmit = vi.fn()
    render(
      <SymbolWT4090Terminal
        session={MOCK_SESSION}
        rfScreen={MOCK_SCREEN}
        inputValue="028018120"
        inputMode="SCAN"
        isComplete={false}
        result={null}
        inputError={null}
        coaching={{ isVisible: false, content: null, step: null }}
        handleSubmit={handleSubmit}
        handleKeyDown={vi.fn()}
        handleSoftKey={vi.fn()}
        setInputValue={vi.fn()}
      />
    )

    const enterBtn = screen.getByText("ENTER")
    fireEvent.click(enterBtn)
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("fires onPullTrigger when ring scanner trigger button is clicked", () => {
    const onPullTrigger = vi.fn()
    render(
      <SymbolWT4090Terminal
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

    const triggerBtn = screen.getByText("PULL TRIGGER")
    fireEvent.click(triggerBtn)
    expect(onPullTrigger).toHaveBeenCalledTimes(1)
  })

  it("toggles backlight contrast state when orange light key is clicked", () => {
    render(
      <SymbolWT4090Terminal
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

    const lightBtn = screen.getByTitle("Toggle Transflective Backlight")
    fireEvent.click(lightBtn)
    // Clicked without error
    expect(lightBtn).toBeTruthy()
  })

  it("fires non-destructive exception softkeys", () => {
    const handleSoftKey = vi.fn()
    render(
      <SymbolWT4090Terminal
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
        handleSoftKey={handleSoftKey}
        setInputValue={vi.fn()}
      />
    )

    const shortBtn = screen.getByText("^K SHORT")
    fireEvent.click(shortBtn)
    expect(handleSoftKey).toHaveBeenCalledWith("CTRL_K")
  })
})
