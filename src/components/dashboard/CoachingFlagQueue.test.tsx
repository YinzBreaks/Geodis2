// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CoachingFlagQueue } from "@/components/dashboard/CoachingFlagQueue"
import type { CoachingFlagSummary } from "@/services/reporting/coaching-flag-reporting"

const FLAG: CoachingFlagSummary = {
  id: "flag-1",
  traineeId: "trainee-1",
  traineeName: "Taylor Trainee",
  employeeId: "EMP-100",
  ownerName: "Sam Supervisor",
  createdByName: "Laura Lead",
  createdByRole: "PICK_LEAD",
  category: "READINESS_GAP",
  reason: "Accuracy below threshold",
  notes: null,
  sourceGap: "Accuracy score below 80",
  status: "OPEN",
  createdAt: "2026-08-16T12:00:00.000Z",
  updatedAt: "2026-08-16T12:00:00.000Z",
  resolvedAt: null,
}

describe("CoachingFlagQueue", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("resolves an open flag with Supervisor notes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ flag: { ...FLAG, status: "RESOLVED" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)
    render(<CoachingFlagQueue initialFlags={[FLAG]} />)

    expect(screen.getByText("Taylor Trainee")).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText("Resolution notes"), {
      target: { value: "Observed successful correction" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Resolve" }))

    await waitFor(() =>
      expect(screen.getByText("No open coaching flags.")).toBeTruthy()
    )
    expect(fetchMock).toHaveBeenCalledWith("/api/coaching-flags/flag-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "RESOLVED",
        notes: "Observed successful correction",
      }),
    })
  })
})
