/**
 * POST /api/sessions/start — Initialize a server-tracked simulation session
 *
 * Auth: any authenticated user.
 * Generates an IN_PROGRESS SimSession record with a server-measured startedAt timestamp.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"
import { SCENARIO_DATA } from "@/data/seedData"
import { DifficultyLevel } from "@/types/domain"
import { randomUUID } from "crypto"

const DIFFICULTIES = new Set<string>(Object.values(DifficultyLevel))

export async function POST(request: NextRequest) {
  const { userId } = await getRoleFromSession()

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("scenarioId" in body) ||
    typeof (body as Record<string, unknown>).scenarioId !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid scenarioId" }, { status: 400 })
  }

  const { scenarioId, difficulty } = body as { scenarioId: string; difficulty?: string }

  const bundle =
    Object.values(SCENARIO_DATA).find(
      (b) => b.scenario.moduleId === scenarioId
    ) ?? SCENARIO_DATA[scenarioId]

  if (!bundle) {
    return NextResponse.json({ error: "Unknown simulation scenario" }, { status: 400 })
  }

  const effectiveDifficulty =
    difficulty && DIFFICULTIES.has(difficulty)
      ? difficulty
      : bundle.scenario.difficulty

  const sessionId = `sim_${randomUUID().replace(/-/g, "").slice(0, 16)}`
  const startedAt = new Date()

  try {
    const session = await prisma.simSession.create({
      data: {
        id: sessionId,
        userId,
        moduleId: scenarioId,
        moduleType: "SIMULATION",
        difficulty: effectiveDifficulty,
        status: "IN_PROGRESS",
        startedAt,
      },
      select: {
        id: true,
        startedAt: true,
        moduleId: true,
        difficulty: true,
        status: true,
      },
    })

    return NextResponse.json(
      {
        sessionId: session.id,
        startedAt: session.startedAt.toISOString(),
        scenarioId: session.moduleId,
        difficulty: session.difficulty,
        status: session.status,
        config: {
          zone: bundle.scenario.zone,
          pickCount: bundle.scenario.pickCount,
          toteCount: bundle.scenario.toteCount,
          passCriteria: bundle.scenario.passCriteria,
        },
        pickQueue: bundle.scenario.steps ?? [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to initialize simulation session:", error)
    return NextResponse.json(
      { error: "Failed to initialize session" },
      { status: 500 }
    )
  }
}
