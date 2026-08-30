import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { DifficultyLevel, ScanResult, WorkflowStep } from "@/types/domain"
import { SCENARIO_DATA } from "@/data/seedData"

// Derive the canonical tote barcode for each pick from the scenario itself.
// Hardcoding the slot mapping here let this fixture silently encode a stale
// pick-queue layout, so it kept passing while the seed data said otherwise.
const Z1_10 = SCENARIO_DATA.Z1_10_PICKS
const pickToteBarcode = (index: number): string =>
  Z1_10.cart.totes[Z1_10.pickQueue[index].targetSlot - 1].barcode

const mocks = vi.hoisted(() => ({
  getRoleFromSession: vi.fn(),
  simSessionFindUnique: vi.fn(),
  simSessionFindMany: vi.fn(),
  simSessionCreate: vi.fn(),
  simSessionUpdate: vi.fn(),
  moduleProgressFindUnique: vi.fn(),
  moduleProgressUpsert: vi.fn(),
  userFindFirst: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock("@/lib/auth/roles", () => ({
  getRoleFromSession: mocks.getRoleFromSession,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    simSession: {
      findUnique: mocks.simSessionFindUnique,
      findMany: mocks.simSessionFindMany,
      create: mocks.simSessionCreate,
      update: mocks.simSessionUpdate,
    },
    moduleProgress: {
      findUnique: mocks.moduleProgressFindUnique,
      upsert: mocks.moduleProgressUpsert,
    },
    user: {
      findFirst: mocks.userFindFirst,
    },
    notification: {
      create: mocks.notificationCreate,
    },
    $transaction: mocks.transaction,
  },
}))

import { GET, POST } from "@/app/api/sessions/route"

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest
}

function validSubmission(): Record<string, unknown> {
  const sessionId = "session-test-001"
  const itemUpcs = [
    "024505572001",
    "031200000027",
    "012345678905",
    "071050030052",
    "041333040109",
    "052000002107",
    "063200012349",
    "074300010041",
    "085000009008",
    "096100025003",
  ]
  return {
    sessionId,
    scenarioId: "sim-z1-10picks",
    difficulty: DifficultyLevel.BEGINNER,
    finalScore: 92,
    accuracyScore: 100,
    speedScore: 80,
    passed: true,
    totalPicks: 10,
    correctFirstScans: 31,
    errorCount: 0,
    durationSeconds: 300,
    totalTimeMs: 300_000,
    errorsEncountered: [],
    exceptionsResolved: 0,
    scanEvents: [
      {
        scanEventId: "scan-zone",
        sessionId,
        step: WorkflowStep.BC_SCAN_ZONE_TASK_GROUP,
        expectedValue: "Z1",
        scannedValue: "Z1",
        result: ScanResult.SUCCESS,
        timestamp: "2026-08-16T12:00:00.000Z",
        responseTimeMs: 250,
      },
      {
        scanEventId: "scan-cart",
        sessionId,
        step: WorkflowStep.BC_SCAN_CART_BARCODE,
        expectedValue: "C000000084",
        scannedValue: "C000000084",
        result: ScanResult.SUCCESS,
        timestamp: "2026-08-16T12:00:01.000Z",
        responseTimeMs: 250,
      },
      ...Array.from({ length: 9 }, (_, index) => ({
        scanEventId: `scan-build-tote-${index + 1}`,
        sessionId,
        step: WorkflowStep.BC_SCAN_TOTE_BARCODE,
        expectedValue: `T${String(11701 + index).padStart(14, "0")}`,
        scannedValue: `T${String(11701 + index).padStart(14, "0")}`,
        result: ScanResult.SUCCESS,
        timestamp: `2026-08-16T12:00:${String(index + 2).padStart(2, "0")}.000Z`,
        responseTimeMs: 250,
      })),
      ...Array.from({ length: 10 }, (_, index) => [
        {
          scanEventId: `scan-item-${index + 1}`,
          sessionId,
          step: WorkflowStep.PK_SCAN_ITEM_UPC,
          expectedValue: itemUpcs[index],
          scannedValue: itemUpcs[index],
          result: ScanResult.SUCCESS,
          timestamp: `2026-08-16T12:00:${String(index * 2 + 11).padStart(2, "0")}.000Z`,
          responseTimeMs: 250,
        },
        {
          scanEventId: `scan-pick-tote-${index + 1}`,
          sessionId,
          step: WorkflowStep.PK_SCAN_TOTE_BARCODE,
          expectedValue: pickToteBarcode(index),
          scannedValue: pickToteBarcode(index),
          result: ScanResult.SUCCESS,
          timestamp: `2026-08-16T12:00:${String(index * 2 + 12).padStart(2, "0")}.000Z`,
          responseTimeMs: 250,
        },
      ]).flat(),
    ],
    errors: [],
  }
}

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRoleFromSession.mockResolvedValue({
      userId: "trainee-1",
      role: "TRAINEE",
    })
    mocks.transaction.mockImplementation((callback) =>
      callback({
        simSession: {
          findUnique: mocks.simSessionFindUnique,
          create: mocks.simSessionCreate,
          update: mocks.simSessionUpdate,
        },
        moduleProgress: {
          findUnique: mocks.moduleProgressFindUnique,
          upsert: mocks.moduleProgressUpsert,
        },
      })
    )
    mocks.simSessionFindUnique.mockResolvedValue(null)
    mocks.simSessionCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id: data.id })
    )
    mocks.simSessionUpdate.mockImplementation(({ where }) =>
      Promise.resolve({ id: where.id })
    )
    mocks.moduleProgressFindUnique.mockResolvedValue(null)
    mocks.moduleProgressUpsert.mockResolvedValue({})
  })

  it("rejects unauthenticated requests with 401", async () => {
    mocks.getRoleFromSession.mockResolvedValue({ userId: null })
    const response = await POST(request(validSubmission()))
    expect(response.status).toBe(401)
  })

  it("persists a newly completed session and returns 201", async () => {
    const response = await POST(request(validSubmission()))
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.sessionId).toBe("session-test-001")
    expect(body.duplicate).toBe(false)
  })

  it("updates an existing IN_PROGRESS session and validates timing", async () => {
    const startedAt = new Date(Date.now() - 310_000) // started 310s ago
    mocks.simSessionFindUnique.mockResolvedValue({
      id: "session-test-001",
      userId: "trainee-1",
      status: "IN_PROGRESS",
      startedAt,
    })

    const response = await POST(request(validSubmission()))
    expect(response.status).toBe(201)
    expect(mocks.simSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-test-001" },
        data: expect.objectContaining({
          status: "COMPLETED",
          totalPicks: 10,
        }),
      })
    )
  })

  it("rejects an IN_PROGRESS session if claimed duration exceeds elapsed server time", async () => {
    const startedAt = new Date(Date.now() - 10_000) // started only 10s ago, but claimed 300s
    mocks.simSessionFindUnique.mockResolvedValue({
      id: "session-test-001",
      userId: "trainee-1",
      status: "IN_PROGRESS",
      startedAt,
    })

    const response = await POST(request(validSubmission()))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe("Session duration exceeds elapsed server time")
  })
})
