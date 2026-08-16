import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth/roles"

interface UpdateFlagBody {
  status?: "OPEN" | "RESOLVED"
  notes?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
) {
  const auth = await requireRole("SUPERVISOR")
  if (!auth.authorized || !auth.userId || !auth.facilityId) {
    return NextResponse.json({ error: auth.error ?? "Unauthorized" }, { status: 403 })
  }

  let body: UpdateFlagBody
  try {
    body = (await request.json()) as UpdateFlagBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (
    !body ||
    (body.status !== undefined && body.status !== "OPEN" && body.status !== "RESOLVED") ||
    (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) ||
    (body.status === undefined && body.notes === undefined)
  ) {
    return NextResponse.json({ error: "Invalid coaching flag update" }, { status: 400 })
  }

  const { flagId } = await params
  const existing = await prisma.coachingFlag.findFirst({
    where: { id: flagId, facilityId: auth.facilityId },
    select: { id: true, status: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Coaching flag not found" }, { status: 404 })
  }

  const resolving = body.status === "RESOLVED"
  const flag = await prisma.coachingFlag.update({
    where: { id: existing.id },
    data: {
      status: body.status,
      notes: body.notes?.trim() || undefined,
      resolvedAt: resolving ? new Date() : body.status === "OPEN" ? null : undefined,
      resolvedById: resolving ? auth.userId : body.status === "OPEN" ? null : undefined,
    },
  })

  return NextResponse.json({ flag })
}
