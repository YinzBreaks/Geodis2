CREATE TABLE "CoachingFlag" (
  "id" TEXT NOT NULL,
  "traineeId" TEXT NOT NULL,
  "facilityId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "resolvedById" TEXT,
  "category" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "sourceGap" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "CoachingFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachingFlag_facilityId_status_idx" ON "CoachingFlag"("facilityId", "status");
CREATE INDEX "CoachingFlag_traineeId_status_idx" ON "CoachingFlag"("traineeId", "status");
CREATE INDEX "CoachingFlag_ownerId_status_idx" ON "CoachingFlag"("ownerId", "status");

ALTER TABLE "CoachingFlag" ADD CONSTRAINT "CoachingFlag_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachingFlag" ADD CONSTRAINT "CoachingFlag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachingFlag" ADD CONSTRAINT "CoachingFlag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoachingFlag" ADD CONSTRAINT "CoachingFlag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
