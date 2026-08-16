import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  redirect: vi.fn(),
  sessionFindFirst: vi.fn(),
}))

vi.mock("@/lib/auth/roles", () => ({
  requireRole: mocks.requireRole,
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    simSession: { findFirst: mocks.sessionFindFirst },
  },
}))

vi.mock("./replay-client", () => ({
  ReplayPageClient: () => null,
}))

import ReplayPage from "@/app/dashboard/supervisor/replay/[sessionId]/page"

describe("Supervisor replay page authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it("redirects callers without Supervisor authorization", async () => {
    mocks.requireRole.mockResolvedValue({ authorized: false })

    await expect(
      ReplayPage({ params: Promise.resolve({ sessionId: "session-1" }) })
    ).rejects.toThrow("REDIRECT:/unauthorized")
    expect(mocks.sessionFindFirst).not.toHaveBeenCalled()
  })

  it("scopes replay lookup to the Supervisor facility and trainee sessions", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      facilityId: "FAC-001",
    })
    mocks.sessionFindFirst.mockResolvedValue(null)

    await ReplayPage({ params: Promise.resolve({ sessionId: "session-1" }) })

    expect(mocks.sessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "session-1",
          user: { facilityId: "FAC-001", role: "TRAINEE" },
        },
      })
    )
  })
})
