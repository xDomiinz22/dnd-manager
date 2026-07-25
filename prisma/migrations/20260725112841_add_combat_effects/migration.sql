-- CreateTable
CREATE TABLE "CombatEffect" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roundsRemaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CombatEffect_participantId_idx" ON "CombatEffect"("participantId");

-- AddForeignKey
ALTER TABLE "CombatEffect" ADD CONSTRAINT "CombatEffect_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CombatParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
