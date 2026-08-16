import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  userFindFirst: vi.fn(),
  flagFindFirst: vi.fn(),
  flagCreate: vi.fn(),
  flagUpdate: vi.fn(),
}))

vi.mock("@/lib/auth/roles", () => ({ requireRole: mocks.requireRole }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: mocks.userFindFirst },
    coachingFlag: {
      findFirst: mocks.flagFindFirst,
      create: mocks.flagCreate,
      update: mocks.flagUpdate,
    },
  },
}))

import { POST } from "@/app/api/coaching-flags/route"
import { PATCH } from "@/app/api/coaching-flags/[flagId]/route"

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/coaching-flags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe("coaching flag API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.userFindFirst.mockResolvedValue({ id: "trainee-1" })
    mocks.flagFindFirst.mockResolvedValue(null)
    mocks.flagCreate.mockResolvedValue({ id: "flag-1", status: "OPEN" })
    mocks.flagUpdate.mockResolvedValue({ id: "flag-1", status: "RESOLVED" })
  })

  it("blocks Pick Leads from creating flags for unassigned trainees", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      userId: "lead-1",
      facilityId: "FAC-001",
      role: "PICK_LEAD",
      assignedTrainees: [],
    })

    const response = await POST(
      request({ traineeId: "trainee-1", category: "PERFORMANCE", reason: "Review" })
    )

    expect(response.status).toBe(403)
    expect(mocks.flagCreate).not.toHaveBeenCalled()
  })

  it("creates a Supervisor-owned flag for an assigned trainee", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      userId: "supervisor-1",
      facilityId: "FAC-001",
      role: "SUPERVISOR",
    })

    const response = await POST(
      request({ traineeId: "trainee-1", category: "READINESS_GAP", reason: "Accuracy gap" })
    )

    expect(response.status).toBe(201)
    expect(mocks.flagCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        traineeId: "trainee-1",
        ownerId: "supervisor-1",
        createdById: "supervisor-1",
      }),
    })
  })

  it("allows a Supervisor to resolve a facility-scoped flag", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      userId: "supervisor-1",
      facilityId: "FAC-001",
      role: "SUPERVISOR",
    })
    mocks.flagFindFirst.mockResolvedValue({ id: "flag-1", status: "OPEN" })

    const response = await PATCH(request({ status: "RESOLVED", notes: "Completed" }), {
      params: Promise.resolve({ flagId: "flag-1" }),
    })

    expect(response.status).toBe(200)
    expect(mocks.flagUpdate).toHaveBeenCalledWith({
      where: { id: "flag-1" },
      data: expect.objectContaining({
        status: "RESOLVED",
        resolvedById: "supervisor-1",
      }),
    })
  })

  it("returns a conflict when a concurrent open flag wins the unique index", async () => {
    mocks.requireRole.mockResolvedValue({
      authorized: true,
      userId: "supervisor-1",
      facilityId: "FAC-001",
      role: "SUPERVISOR",
    })
    mocks.flagCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.22.0",
      })
    )

    const response = await POST(
      request({ traineeId: "trainee-1", category: "READINESS_GAP", reason: "Review" })
    )

    expect(response.status).toBe(409)
  })
})
