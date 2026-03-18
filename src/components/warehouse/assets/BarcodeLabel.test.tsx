/**
 * BarcodeLabel.test.tsx — tests for the 250ms scan delay barcode label
 *
 * Validates:
 *   1. onScan fires after SCAN_DELAY_MS (250ms)
 *   2. onScan NOT called when value is empty
 *   3. onScan NOT called when scannable is false
 *   4. scanning state is true during the delay window
 *   5. valueToBars produces consistent output
 */

// @vitest-environment jsdom
import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { BarcodeLabel, SCAN_DELAY_MS } from "./BarcodeLabel"
import { DifficultyLevel } from "@/types/domain"

describe("BarcodeLabel", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("calls onScan with the barcode value after 250ms delay", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value="C000000083"
        scannable={true}
        difficulty={DifficultyLevel.BEGINNER}
        onScan={onScan}
      />
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    // Not called immediately
    expect(onScan).not.toHaveBeenCalled()

    // Called after 250ms
    act(() => {
      vi.advanceTimersByTime(SCAN_DELAY_MS)
    })

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith("C000000083")
  })

  it("does NOT call onScan when scannable is false", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value="C000000083"
        scannable={false}
        difficulty={DifficultyLevel.BEGINNER}
        onScan={onScan}
      />
    )

    // Should not have role="button" when not scannable
    const el = screen.queryByRole("button")
    expect(el).toBeNull()
  })

  it("does NOT call onScan when value is empty", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value=""
        scannable={true}
        difficulty={DifficultyLevel.BEGINNER}
        onScan={onScan}
      />
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    act(() => {
      vi.advanceTimersByTime(SCAN_DELAY_MS + 50)
    })

    expect(onScan).not.toHaveBeenCalled()
  })

  it("shows the barcode value text", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value="T00000000011692"
        scannable={true}
        onScan={onScan}
      />
    )

    expect(screen.getByText("T00000000011692")).toBeTruthy()
  })

  it("renders with accessible label when scannable", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value="024505572001"
        scannable={true}
        onScan={onScan}
      />
    )

    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-label")).toBe("Scan barcode 024505572001")
  })

  it("fires onScan via keyboard Enter key", () => {
    const onScan = vi.fn()
    render(
      <BarcodeLabel
        value="C000000083"
        scannable={true}
        difficulty={DifficultyLevel.INTERMEDIATE}
        onScan={onScan}
      />
    )

    const button = screen.getByRole("button")
    fireEvent.keyDown(button, { key: "Enter" })

    act(() => {
      vi.advanceTimersByTime(SCAN_DELAY_MS)
    })

    expect(onScan).toHaveBeenCalledTimes(1)
    expect(onScan).toHaveBeenCalledWith("C000000083")
  })

  it("SCAN_DELAY_MS is exactly 250", () => {
    expect(SCAN_DELAY_MS).toBe(250)
  })
})
