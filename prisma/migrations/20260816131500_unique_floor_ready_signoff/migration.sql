-- Floor-ready confirmation is immutable in the pilot: one signoff per trainee.
CREATE UNIQUE INDEX "FloorReadySignoff_traineeId_key"
ON "FloorReadySignoff"("traineeId");
