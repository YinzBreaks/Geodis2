/**
 * GET /api/sessions — Current user's simulation session summary
 * POST /api/sessions — Persist a completed simulation session
 *
 * Auth: any authenticated user.
 */

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"
import {
  getNextProgressState,
  parseSessionSubmission,
  type SessionSubmission,
} from "@/services/session-persistence"

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

interface PersistSessionOutcome {
  sessionId: string
  created: boolean
}

async function persistCompletedSession(
  userId: string,
  body: SessionSubmission
): Promise<PersistSessionOutcome> {
  const completedAt = new Date()

  return prisma.$transaction(
    async (tx) => {
      const existingSession = await tx.simSession.findUnique({
        where: { id: body.sessionId },
        select: { id: true, userId: true },
      })

      if (existingSession) {
        if (existingSession.userId !== userId) {
          throw new Error("SESSION_ID_CONFLICT")
        }
        return { sessionId: existingSession.id, created: false }
      }

      const existingProgress = await tx.moduleProgress.findUnique({
        where: {
          userId_moduleId: { userId, moduleId: body.scenarioId },
        },
        select: {
          bestScore: true,
          completed: true,
          completedAt: true,
          timeSpentMs: true,
        },
      })
      const nextProgress = getNextProgressState(
        existingProgress,
        body,
        completedAt
      )

      const session = await tx.simSession.create({
        data: {
          id: body.sessionId,
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
          totalTimeMs: body.totalTimeMs,
          completedAt,
          scanEvents: body.scanEvents as unknown as Prisma.InputJsonValue,
          errors: body.errors as unknown as Prisma.InputJsonValue,
          replayEvents: body.scanEvents as unknown as Prisma.InputJsonValue,
        },
      })

      await tx.moduleProgress.upsert({
        where: {
          userId_moduleId: { userId, moduleId: body.scenarioId },
        },
        update: {
          attempts: { increment: 1 },
          bestScore: nextProgress.bestScore,
          lastAttemptAt: completedAt,
          completed: nextProgress.completed,
          completedAt: nextProgress.completedAt,
          timeSpentMs: nextProgress.timeSpentMs,
        },
        create: {
          userId,
          moduleId: body.scenarioId,
          attempts: 1,
          bestScore: nextProgress.bestScore,
          lastAttemptAt: completedAt,
          completed: nextProgress.completed,
          completedAt: nextProgress.completedAt,
          timeSpentMs: nextProgress.timeSpentMs,
        },
      })

      return { sessionId: session.id, created: true }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
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

  const parsed = parseSessionSubmission(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  let outcome: PersistSessionOutcome
  try {
    outcome = await persistCompletedSession(userId, parsed.data)
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_ID_CONFLICT") {
      return NextResponse.json({ error: "Session ID conflict" }, { status: 409 })
    }
    throw error
  }

  // ── Supervisor notification for ADVANCED pass ─────────────────────────────
  // Per task spec: "triggers a Notification record if supervisor exists"
  if (outcome.created && parsed.data.passed && parsed.data.difficulty === "ADVANCED") {
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
            message: `Trainee completed ADVANCED simulation "${parsed.data.scenarioId}" with score ${parsed.data.finalScore}.`,
          },
        })
      }
    } catch {
      // Notification failure must never block the session response
    }
  }

  return NextResponse.json(
    { sessionId: outcome.sessionId, duplicate: !outcome.created },
    { status: outcome.created ? 201 : 200 }
  )
}
