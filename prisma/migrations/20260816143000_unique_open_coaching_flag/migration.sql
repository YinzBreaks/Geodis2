-- Prevent concurrent requests from creating duplicate active coaching flags.
CREATE UNIQUE INDEX "CoachingFlag_open_trainee_category_key"
ON "CoachingFlag"("traineeId", "category")
WHERE "status" = 'OPEN';
