/**
 * GET /api/sessions — Current user's simulation session summary
 * POST /api/sessions — Persist a completed simulation session
 *
 * Auth: any authenticated user.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"

// ─────────────────────────────────────────────────────────────────────────────
// GET — best score per moduleId for the current user
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const { userId } = await getRoleFromSession()

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const sessions = await prisma.simSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      finalScore: { not: null },
    },
    select: {
      moduleId: true,
      finalScore: true,
      passed: true,
    },
    orderBy: { completedAt: "desc" },
  })

  // Reduce to best score per moduleId
  const bestByModule: Record<string, { bestScore: number; passed: boolean }> =
    {}

  for (const s of sessions) {
    const score = s.finalScore ?? 0
    const existing = bestByModule[s.moduleId]
    if (!existing || score > existing.bestScore) {
      bestByModule[s.moduleId] = {
        bestScore: Math.round(score),
        passed: s.passed ?? false,
      }
    }
  }

  return NextResponse.json(bestByModule)
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — persist a completed simulation session
// ─────────────────────────────────────────────────────────────────────────────

/** Expected request body for POST /api/sessions */
interface PostSessionBody {
  scenarioId: string
  difficulty: string
  finalScore: number
  accuracyScore: number
  speedScore: number
  passed: boolean
  totalPicks: number
  correctFirstScans: number
  errorCount: number
  durationSeconds: number
  errorsEncountered: string[]
  exceptionsResolved: number
  replayEvents: unknown[]
}

function isValidBody(b: unknown): b is PostSessionBody {
  if (!b || typeof b !== "object") return false
  const v = b as Record<string, unknown>
  return (
    typeof v.scenarioId === "string" &&
    typeof v.difficulty === "string" &&
    typeof v.finalScore === "number" &&
    typeof v.accuracyScore === "number" &&
    typeof v.speedScore === "number" &&
    typeof v.passed === "boolean" &&
    typeof v.totalPicks === "number" &&
    typeof v.errorCount === "number" &&
    typeof v.durationSeconds === "number" &&
    typeof v.exceptionsResolved === "number" &&
    Array.isArray(v.errorsEncountered) &&
    Array.isArray(v.replayEvents)
  )
}

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

  if (!isValidBody(body)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const session = await prisma.simSession.create({
    data: {
      userId,
      moduleId: body.scenarioId,
      moduleType: "SIMULATION",
      difficulty: body.difficulty,
      status: "COMPLETED",
      finalScore: body.finalScore,
      accuracyScore: body.accuracyScore,
      speedScore: body.speedScore,
      passed: body.passed,
      totalPicks: body.totalPicks,
      errorCount: body.errorCount,
      totalTimeMs: body.durationSeconds * 1000,
      completedAt: new Date(),
      // Store replay events for future replay feature
      replayEvents: body.replayEvents as Parameters<
        typeof prisma.simSession.create
      >[0]["data"]["replayEvents"],
    },
  })

  // Upsert module progress (best score tracking)
  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId: body.scenarioId } },
    update: {
      attempts: { increment: 1 },
      bestScore: { set: body.finalScore }, // will be overwritten by logic below
      lastAttemptAt: new Date(),
      completed: body.passed ? true : undefined,
      completedAt: body.passed ? new Date() : undefined,
    },
    create: {
      userId,
      moduleId: body.scenarioId,
      attempts: 1,
      bestScore: body.finalScore,
      completed: body.passed,
      completedAt: body.passed ? new Date() : undefined,
    },
  })

  // Ensure bestScore is always the maximum — do a conditional update
  await prisma.moduleProgress.updateMany({
    where: {
      userId,
      moduleId: body.scenarioId,
      bestScore: { lt: body.finalScore },
    },
    data: { bestScore: body.finalScore },
  })

  // ── Supervisor notification for ADVANCED pass ─────────────────────────────
  // Per task spec: "triggers a Notification record if supervisor exists"
  if (body.passed && body.difficulty === "ADVANCED") {
    try {
      const supervisor = await prisma.user.findFirst({
        where: {
          role: "SUPERVISOR",
          assignedTrainees: { has: userId },
        },
        select: { id: true },
      })

      if (supervisor) {
        await prisma.notification.create({
          data: {
            fromUserId: userId,
            toUserId: supervisor.id,
            traineeId: userId,
            type: "FLAG_FOR_REVIEW",
            message: `Trainee completed ADVANCED simulation "${body.scenarioId}" with score ${body.finalScore}.`,
          },
        })
      }
    } catch {
      // Notification failure must never block the session response
    }
  }

  return NextResponse.json({ sessionId: session.id }, { status: 201 })
}
