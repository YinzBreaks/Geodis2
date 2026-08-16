import { NextResponse, type NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"
import {
  getCoachingFlagSummaries,
  type CoachingFlagStatus,
} from "@/services/reporting/coaching-flag-reporting"

const CATEGORIES = new Set([
  "READINESS_GAP",
  "PERFORMANCE",
  "EXCEPTION",
  "INACTIVITY",
  "OTHER",
])

interface CreateFlagBody {
  traineeId: string
  category: string
  reason: string
  notes?: string
  sourceGap?: string
}

export async function GET(request: NextRequest) {
  const auth = await requireRole("SUPERVISOR", "PICK_LEAD")
  if (!auth.authorized || !auth.facilityId) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: 403 })
  }

  const requestedStatus = request.nextUrl.searchParams.get("status")
  const status: CoachingFlagStatus = requestedStatus === "RESOLVED" ? "RESOLVED" : "OPEN"
  const traineeIds = auth.role === "PICK_LEAD" ? auth.assignedTrainees ?? [] : undefined
  const flags = await getCoachingFlagSummaries({
    facilityId: auth.facilityId,
    status,
    traineeIds,
  })

  return NextResponse.json({ flags })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("SUPERVISOR", "PICK_LEAD")
  if (!auth.authorized || !auth.userId || !auth.facilityId || !auth.role) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: 403 })
  }

  let body: CreateFlagBody
  try {
    body = (await request.json()) as CreateFlagBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (
    !body ||
    typeof body.traineeId !== "string" ||
    !CATEGORIES.has(body.category) ||
    typeof body.reason !== "string" ||
    body.reason.trim().length === 0 ||
    body.reason.length > 500 ||
    (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) ||
    (body.sourceGap !== undefined && (typeof body.sourceGap !== "string" || body.sourceGap.length > 500))
  ) {
    return NextResponse.json({ error: "Invalid coaching flag data" }, { status: 400 })
  }

  const trainee = await prisma.user.findFirst({
    where: { id: body.traineeId, facilityId: auth.facilityId, role: "TRAINEE" },
    select: { id: true },
  })
  if (!trainee) {
    return NextResponse.json({ error: "Trainee not found" }, { status: 404 })
  }
  if (auth.role === "PICK_LEAD" && !(auth.assignedTrainees ?? []).includes(trainee.id)) {
    return NextResponse.json({ error: "Trainee is not assigned to this Pick Lead" }, { status: 403 })
  }

  const ownerId =
    auth.role === "SUPERVISOR"
      ? auth.userId
      : (
          await prisma.user.findFirst({
            where: { facilityId: auth.facilityId, role: "SUPERVISOR" },
            select: { id: true },
          })
        )?.id
  if (!ownerId) {
    return NextResponse.json({ error: "No Supervisor found at trainee facility" }, { status: 409 })
  }

  const duplicate = await prisma.coachingFlag.findFirst({
    where: { traineeId: trainee.id, category: body.category, status: "OPEN" },
    select: { id: true },
  })
  if (duplicate) {
    return NextResponse.json({ error: "An open coaching flag already exists for this category" }, { status: 409 })
  }

  let flag
  try {
    flag = await prisma.coachingFlag.create({
      data: {
        traineeId: trainee.id,
        facilityId: auth.facilityId,
        createdById: auth.userId,
        ownerId,
        category: body.category,
        reason: body.reason.trim(),
        notes: body.notes?.trim() || null,
        sourceGap: body.sourceGap?.trim() || null,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An open coaching flag already exists for this category" },
        { status: 409 }
      )
    }
    throw error
  }

  return NextResponse.json({ flag }, { status: 201 })
}
