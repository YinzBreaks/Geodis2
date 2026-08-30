import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  getRoleFromSession: vi.fn(),
  simSessionCreate: vi.fn(),
}))

vi.mock("@/lib/auth/roles", () => ({
  getRoleFromSession: mocks.getRoleFromSession,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    simSession: {
      create: mocks.simSessionCreate,
    },
  },
}))

import { POST } from "@/app/api/sessions/start/route"

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe("POST /api/sessions/start", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRoleFromSession.mockResolvedValue({
      userId: "trainee-1",
      role: "TRAINEE",
    })
    mocks.simSessionCreate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: data.id,
        startedAt: data.startedAt,
        moduleId: data.moduleId,
        difficulty: data.difficulty,
        status: data.status,
      })
    )
  })

  it("rejects unauthenticated requests with 401", async () => {
    mocks.getRoleFromSession.mockResolvedValue({
      userId: null,
      role: null,
    })

    const response = await POST(request({ scenarioId: "sim-z1-10" }))
    expect(response.status).toBe(401)
    expect(mocks.simSessionCreate).not.toHaveBeenCalled()
  })

  it("rejects missing or invalid scenarioId with 400", async () => {
    const response = await POST(request({ scenarioId: "nonexistent-scenario" }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("Unknown simulation scenario")
    expect(mocks.simSessionCreate).not.toHaveBeenCalled()
  })

  it("initializes an IN_PROGRESS session and returns 201 with session metadata", async () => {
    const response = await POST(
      request({ scenarioId: "sim-z1-10picks", difficulty: "BEGINNER" })
    )
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.sessionId).toBeDefined()
    expect(body.sessionId.startsWith("sim_")).toBe(true)
    expect(body.scenarioId).toBe("sim-z1-10picks")
    expect(body.difficulty).toBe("BEGINNER")
    expect(body.status).toBe("IN_PROGRESS")
    expect(body.startedAt).toBeDefined()
    expect(mocks.simSessionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "trainee-1",
        moduleId: "sim-z1-10picks",
        moduleType: "SIMULATION",
        difficulty: "BEGINNER",
        status: "IN_PROGRESS",
      }),
      select: expect.any(Object),
    })
  })
})
