import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  userFindUnique: vi.fn(),
  signoffFindFirst: vi.fn(),
  signoffCreate: vi.fn(),
  assessFloorReadiness: vi.fn(),
}))

vi.mock("@/lib/auth/roles", () => ({
  requireRole: mocks.requireRole,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    floorReadySignoff: {
      findFirst: mocks.signoffFindFirst,
      create: mocks.signoffCreate,
    },
  },
}))

vi.mock("@/lib/floorReadiness", () => ({
  assessFloorReadiness: mocks.assessFloorReadiness,
}))

import { POST } from "@/app/api/signoff/route"

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/signoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

function trainee(overrides: Record<string, unknown> = {}) {
  return {
    id: "trainee-1",
    facilityId: "FAC-001",
    role: "TRAINEE",
    sessions: [],
    moduleProgress: [],
    ...overrides,
  }
}

describe("POST /api/signoff", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      userId: "supervisor-1",
      facilityId: "FAC-001",
    })
    mocks.userFindUnique.mockResolvedValue(trainee())
    mocks.signoffFindFirst.mockResolvedValue(null)
    mocks.assessFloorReadiness.mockReturnValue({
      status: "FLOOR_READY",
      gaps: [],
      exceptionCoverage: {},
      scoreHistory: [],
      trend: "plateauing",
    })
    mocks.signoffCreate.mockResolvedValue({
      id: "signoff-1",
      traineeId: "trainee-1",
      supervisorId: "supervisor-1",
      facilityId: "FAC-001",
      status: "CONFIRMED",
      notes: null,
      confirmedAt: new Date("2026-08-16T12:00:00.000Z"),
      thresholdSnapshot: {},
    })
  })

  it("rejects a caller without Supervisor authorization", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: false,
      error: "Not authenticated",
    })

    const response = await POST(request({ traineeId: "trainee-1" }))

    expect(response.status).toBe(403)
    expect(mocks.userFindUnique).not.toHaveBeenCalled()
  })

  it("rejects a trainee outside the Supervisor facility", async () => {
    mocks.userFindUnique.mockResolvedValue(
      trainee({ facilityId: "FAC-OTHER" })
    )

    const response = await POST(request({ traineeId: "trainee-1" }))

    expect(response.status).toBe(403)
    expect(mocks.signoffCreate).not.toHaveBeenCalled()
  })

  it("rejects signoff when readiness thresholds are not met", async () => {
    mocks.assessFloorReadiness.mockReturnValue({
      status: "IN_PROGRESS",
      gaps: [{ criterion: "No ADVANCED simulation passed" }],
      exceptionCoverage: {},
      scoreHistory: [],
      trend: "plateauing",
    })

    const response = await POST(request({ traineeId: "trainee-1" }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toBe("Trainee has not met all floor-ready thresholds")
    expect(body.gaps).toHaveLength(1)
    expect(mocks.signoffCreate).not.toHaveBeenCalled()
  })

  it("creates a signoff for an eligible trainee", async () => {
    const response = await POST(
      request({ traineeId: "trainee-1", notes: "Observed on floor" })
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.signoff.id).toBe("signoff-1")
    expect(mocks.signoffCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        traineeId: "trainee-1",
        supervisorId: "supervisor-1",
        facilityId: "FAC-001",
        status: "CONFIRMED",
        notes: "Observed on floor",
      }),
    })
  })

  it("returns a conflict when a concurrent signoff already exists", async () => {
    mocks.signoffCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.22.0",
      })
    )

    const response = await POST(request({ traineeId: "trainee-1" }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe("Trainee already has a floor-ready signoff")
  })
})
