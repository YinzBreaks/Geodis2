// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, act } from "@testing-library/react"
import { ScaffoldingCallout } from "./ScaffoldingCallout"
import { SoftFailToast } from "./SoftFailToast"
import { IdleHintBanner } from "./IdleHintBanner"
import { ProtocolHelpModal } from "./ProtocolHelpModal"
import { KineticCockpit } from "../KineticCockpit"
import { DifficultyLevel, WorkflowStep, Zone } from "@/types/domain"
import type { SimulationSession } from "@/types/domain"

const MOCK_SESSION: SimulationSession = {
  sessionId: "scaff-test-1",
  userId: "user-1",
  moduleId: "DAY1_EQUIPMENT_CHECK_DIGIT",
  status: "IN_PROGRESS",
  startedAt: new Date(),
  difficulty: DifficultyLevel.BEGINNER,
  currentStep: WorkflowStep.PK_VERIFY_LOCATION,
  currentPickIndex: 0,
  currentToteSlot: 1,
  toteStack: [],
  scanEvents: [],
  errors: [],
  pickQueue: [
    {
      pickTaskId: "pick-1",
      orderNumber: "ORD-001",
      quantityRequired: 1,
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
        sku: "SKU-001",
        upcBarcode: "012345678905",
        lastFourDigits: "8905",
        description: "Industrial Pack",
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

describe("Progressive Scaffolding Components", () => {
  describe("ScaffoldingCallout", () => {
    it("renders Beat 1 Location callout with pointer-events-none", () => {
      render(<ScaffoldingCallout beat={1} checkDigit="47" />)
      const callout = screen.getByTestId("scaffolding-callout-beat-1")
      expect(callout).toBeTruthy()
      expect(callout.className).toContain("pointer-events-none")
      expect(screen.getByText("STEP 1: CONFIRM LOCATION")).toBeTruthy()
      expect(screen.getByText("[47]")).toBeTruthy()
    })

    it("renders Beat 2 SKU callout", () => {
      render(<ScaffoldingCallout beat={2} />)
      const callout = screen.getByTestId("scaffolding-callout-beat-2")
      expect(callout).toBeTruthy()
      expect(callout.className).toContain("pointer-events-none")
      expect(screen.getByText("STEP 2: VERIFY SKU")).toBeTruthy()
    })

    it("renders Beat 3 Quantity callout", () => {
      render(<ScaffoldingCallout beat={3} quantity={2} />)
      const callout = screen.getByTestId("scaffolding-callout-beat-3")
      expect(callout).toBeTruthy()
      expect(screen.getByText("STEP 3: CONFIRM QUANTITY")).toBeTruthy()
      expect(screen.getByText(/Check pick qty \(2\)/)).toBeTruthy()
    })

    it("renders Beat 4 Tote callout", () => {
      render(<ScaffoldingCallout beat={4} targetSlot={3} targetToteId="TOTE-03" />)
      const callout = screen.getByTestId("scaffolding-callout-beat-4")
      expect(callout).toBeTruthy()
      expect(screen.getByText("STEP 4: DEPOSIT TO TOTE")).toBeTruthy()
      expect(screen.getByText(/Slot 3 \/ TOTE-03/)).toBeTruthy()
    })
  })

  describe("SoftFailToast", () => {
    it("renders non-punitive instructional toast and handles dismiss", () => {
      const onDismiss = vi.fn()
      render(
        <SoftFailToast
          message="WRONG SEQUENCE: Confirm location check-digit [47] first"
          onDismiss={onDismiss}
        />
      )

      expect(screen.getByTestId("soft-fail-toast")).toBeTruthy()
      expect(
        screen.getByText("WRONG SEQUENCE: Confirm location check-digit [47] first")
      ).toBeTruthy()

      const closeBtn = screen.getByText("✕")
      fireEvent.click(closeBtn)
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it("renders nothing when message is null", () => {
      const { container } = render(<SoftFailToast message={null} onDismiss={vi.fn()} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("IdleHintBanner", () => {
    it("renders contextual hint when visible", () => {
      render(<IdleHintBanner visible={true} beat={1} checkDigit="47" />)
      const banner = screen.getByTestId("idle-hint-banner")
      expect(banner).toBeTruthy()
      expect(banner.className).toContain("pointer-events-none")
      expect(screen.getByText(/shelf check-digit \[47\]/)).toBeTruthy()
    })

    it("renders nothing when visible is false", () => {
      const { container } = render(<IdleHintBanner visible={false} beat={1} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("ProtocolHelpModal", () => {
    it("renders 4-beat SOP and handles close", () => {
      const onClose = vi.fn()
      render(<ProtocolHelpModal isOpen={true} onClose={onClose} />)

      expect(screen.getByTestId("protocol-help-modal")).toBeTruthy()
      expect(screen.getByText(/STANDARD OPERATING PROCEDURE/)).toBeTruthy()
      expect(screen.getByText("1. CONFIRM LOCATION")).toBeTruthy()
      expect(screen.getByText("2. VERIFY SKU")).toBeTruthy()
      expect(screen.getByText("3. CONFIRM QUANTITY")).toBeTruthy()
      expect(screen.getByText("4. DEPOSIT TO TOTE")).toBeTruthy()

      const closeBtn = screen.getByText("✕ CLOSE")
      fireEvent.click(closeBtn)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it("renders nothing when isOpen is false", () => {
      const { container } = render(<ProtocolHelpModal isOpen={false} onClose={vi.fn()} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe("KineticCockpit Scaffolding Integration", () => {
    it("renders Day 1 Guided Tutorial tier with anchored callout and cadence strip", () => {
      render(
        <KineticCockpit
          session={MOCK_SESSION}
          coaching={{ isVisible: true, content: null, step: WorkflowStep.PK_VERIFY_LOCATION }}
          result={null}
          processInput={vi.fn()}
        />
      )

      // Tier buttons
      expect(screen.getByText("[DAY 1: GUIDED TUTORIAL]")).toBeTruthy()
      expect(screen.getByText("[DAY 3: INTERMEDIATE]")).toBeTruthy()
      expect(screen.getByText("[DAY 5: FLOOR CERTIFICATION]")).toBeTruthy()

      // Active Beat 1 Callout
      expect(screen.getByTestId("scaffolding-callout-beat-1")).toBeTruthy()

      // 4-Beat Cadence Bar
      expect(screen.getByText(/1\. LOCATION/)).toBeTruthy()
    })

    it("intercepts out-of-sequence clicks in BEGINNER mode with SoftFailToast and zero FTPA penalty", () => {
      const processInput = vi.fn()
      render(
        <KineticCockpit
          session={MOCK_SESSION} // In Beat 1 (Location)
          coaching={{ isVisible: true, content: null, step: WorkflowStep.PK_VERIFY_LOCATION }}
          result={null}
          processInput={processInput}
        />
      )

      // User clicks carton barcode while still in Beat 1
      const cartonBarcode = screen.getByTitle("Click or Scan Item Barcode")
      fireEvent.click(cartonBarcode)

      // Soft-fail toast appears
      expect(screen.getByTestId("soft-fail-toast")).toBeTruthy()
      expect(screen.getByText(/WRONG SEQUENCE: Confirm location check-digit/)).toBeTruthy()

      // Crucial: processInput was NOT called (no penalty to FTPA)
      expect(processInput).not.toHaveBeenCalled()
    })

    it("suppresses cadence strip and callouts when in ADVANCED (Floor Certification) mode", () => {
      const advancedSession = {
        ...MOCK_SESSION,
        difficulty: DifficultyLevel.ADVANCED,
      }

      render(
        <KineticCockpit
          session={advancedSession}
          coaching={{ isVisible: false, content: null, step: null }}
          result={null}
          processInput={vi.fn()}
        />
      )

      // Scaffolding callouts and cadence strip must be suppressed
      expect(screen.queryByTestId("scaffolding-callout-beat-1")).toBeNull()
      expect(screen.queryByText(/4-BEAT CADENCE:/)).toBeNull()
    })

    it("opens ProtocolHelpModal when tapping [?] SOP button", () => {
      render(
        <KineticCockpit
          session={MOCK_SESSION}
          coaching={{ isVisible: false, content: null, step: null }}
          result={null}
          processInput={vi.fn()}
        />
      )

      const sopButton = screen.getByTitle("Open 4-Beat Protocol Quick Reference")
      fireEvent.click(sopButton)

      expect(screen.getByTestId("protocol-help-modal")).toBeTruthy()
    })
  })
})
