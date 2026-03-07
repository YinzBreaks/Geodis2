/**
 * GET /api/sessions — Current user's simulation session summary
 *
 * Auth: any authenticated user.
 * Returns best score per moduleId for completed sessions belonging to the
 * current user.
 *
 * Response shape:
 *   { [moduleId: string]: { bestScore: number; passed: boolean } }
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"

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
