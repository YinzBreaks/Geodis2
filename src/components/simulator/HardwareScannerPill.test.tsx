// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { HardwareScannerPill } from "./HardwareScannerPill"

describe("HardwareScannerPill", () => {
  it("renders active hardware wedge by default", () => {
    render(<HardwareScannerPill />)
    expect(
      screen.getByText("● HARDWARE SCANNER ACTIVE (HID WEDGE)")
    ).toBeTruthy()
  })

  it("renders compact mode correctly", () => {
    render(<HardwareScannerPill compact />)
    expect(screen.getByText("HID WEDGE")).toBeTruthy()
  })

  it("toggles between HID Wedge and Optical Reticle mode on click", () => {
    render(<HardwareScannerPill />)
    const toggleBtn = screen.getByRole("button")

    // Default: HID Wedge
    expect(screen.getByText("● HARDWARE SCANNER ACTIVE (HID WEDGE)")).toBeTruthy()

    // Click to toggle to Optical Reticle
    fireEvent.click(toggleBtn)
    expect(screen.getByText("⌖ OPTICAL RETICLE MODE")).toBeTruthy()

    // Click again to toggle back
    fireEvent.click(toggleBtn)
    expect(screen.getByText("● HARDWARE SCANNER ACTIVE (HID WEDGE)")).toBeTruthy()
  })

  it("surfaces glove-friendly software trigger when optical reticle mode is active", () => {
    const handleTrigger = vi.fn()
    render(<HardwareScannerPill onTriggerScan={handleTrigger} />)

    // Initially hidden
    expect(screen.queryByText("PULL TRIGGER")).toBeNull()

    // Switch to Optical Reticle
    const toggleBtn = screen.getByRole("button")
    fireEvent.click(toggleBtn)

    // Trigger button should now be visible
    const triggerBtn = screen.getByText("PULL TRIGGER")
    expect(triggerBtn).toBeTruthy()

    fireEvent.click(triggerBtn)
    expect(handleTrigger).toHaveBeenCalledTimes(1)
  })
})
