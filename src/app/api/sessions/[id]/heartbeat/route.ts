/**
 * POST /api/sessions/[id]/heartbeat — Progressive Telemetry Buffer
 *
 * Wi-Fi Drop & Battery Disconnect Resilience:
 * Ingests progressive pick state from warehouse carts every 5 picks to prevent
 * telemetry loss during 2.4GHz/5GHz roaming handoffs in high-bay metal racking corridors.
 */

import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getRoleFromSession } from "@/lib/auth/roles"

interface HeartbeatPayload {
  currentPickIndex: number
  currentBeat?: number
  pickCadenceSeconds?: number
  backtracks?: number
  misSlotAttempts?: number
  scanEventsBuffer?: unknown[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
  }

  let body: HeartbeatPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { currentPickIndex, backtracks = 0, misSlotAttempts = 0, scanEventsBuffer = [] } = body

  if (typeof currentPickIndex !== "number" || currentPickIndex < 0) {
    return NextResponse.json({ error: "Invalid currentPickIndex" }, { status: 400 })
  }

  const { userId } = await getRoleFromSession()

  // Attempt database update if Prisma is configured
  let syncedToDb = false
  try {
    if (process.env.DATABASE_URL && prisma) {
      const existing = await prisma.simSession.findUnique({
        where: { id: sessionId },
        select: { id: true, userId: true, status: true, scanEvents: true },
      })

      if (existing) {
        // Enforce session ownership if authenticated
        if (userId && existing.userId !== userId) {
          return NextResponse.json(
            { error: "Forbidden: Cannot heartbeat another user's session" },
            { status: 403 }
          )
        }

        // Merge buffered events into existing scan events
        const existingEvents = Array.isArray(existing.scanEvents)
          ? existing.scanEvents
          : []
        const mergedEvents = [...existingEvents, ...scanEventsBuffer]

        await prisma.simSession.update({
          where: { id: sessionId },
          data: {
            scanEvents: mergedEvents as Prisma.InputJsonValue,
            totalPicks: currentPickIndex,
            errorCount: misSlotAttempts,
            status: existing.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
          },
        })
        syncedToDb = true
      }
    }
  } catch (error) {
    console.error(`Heartbeat DB sync error for session ${sessionId}:`, error)
    syncedToDb = false
  }

  return NextResponse.json({
    success: true,
    sessionId,
    lastSyncedPick: currentPickIndex,
    syncedToDb,
    timestamp: Date.now(),
  })
}
