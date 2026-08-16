import { prisma } from "@/lib/prisma"

export type CoachingFlagStatus = "OPEN" | "RESOLVED"

export interface CoachingFlagSummary {
  id: string
  traineeId: string
  traineeName: string
  employeeId: string
  ownerName: string
  createdByName: string
  createdByRole: string
  category: string
  reason: string
  notes: string | null
  sourceGap: string | null
  status: CoachingFlagStatus
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

interface CoachingFlagScope {
  facilityId: string
  status: CoachingFlagStatus
  traineeIds?: string[]
}

/** Query coaching flags using the same facility/assignment scope as dashboards. */
export async function getCoachingFlagSummaries({
  facilityId,
  status,
  traineeIds,
}: CoachingFlagScope): Promise<CoachingFlagSummary[]> {
  if (traineeIds && traineeIds.length === 0) return []

  const flags = await prisma.coachingFlag.findMany({
    where: {
      facilityId,
      status,
      ...(traineeIds ? { traineeId: { in: traineeIds } } : {}),
    },
    include: {
      trainee: { select: { name: true, employeeId: true } },
      owner: { select: { name: true } },
      createdBy: { select: { name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return flags.map((flag) => ({
    id: flag.id,
    traineeId: flag.traineeId,
    traineeName: flag.trainee.name,
    employeeId: flag.trainee.employeeId,
    ownerName: flag.owner.name,
    createdByName: flag.createdBy.name,
    createdByRole: flag.createdBy.role,
    category: flag.category,
    reason: flag.reason,
    notes: flag.notes,
    sourceGap: flag.sourceGap,
    status: flag.status as CoachingFlagStatus,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
    resolvedAt: flag.resolvedAt?.toISOString() ?? null,
  }))
}
