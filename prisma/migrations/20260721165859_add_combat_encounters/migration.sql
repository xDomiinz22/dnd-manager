-- AlterEnum
ALTER TYPE "ChatMessageKind" ADD VALUE 'COMBAT';

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "enemyId" TEXT;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "combatEvent" TEXT;

-- CreateTable
CREATE TABLE "EnemyStatBlock" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxHp" INTEGER NOT NULL DEFAULT 1,
    "armorClass" INTEGER,
    "initiativeBonus" INTEGER NOT NULL DEFAULT 0,
    "portraitAssetId" TEXT,
    "quickAttacks" JSONB,
    "rawSystem" JSONB,
    "items" JSONB,
    "derived" JSONB,
    "sourceMdHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnemyStatBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatEncounter" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentTurnIndex" INTEGER,
    "round" INTEGER NOT NULL DEFAULT 1,
    "startedByUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatParticipant" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "characterId" TEXT,
    "enemyId" TEXT,
    "displayName" TEXT NOT NULL,
    "initiativeTotal" INTEGER,
    "initiativeBonus" INTEGER NOT NULL DEFAULT 0,
    "turnOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnemyStatBlock_groupId_idx" ON "EnemyStatBlock"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CombatEncounter_groupId_key" ON "CombatEncounter"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "CombatEncounter_sessionId_key" ON "CombatEncounter"("sessionId");

-- CreateIndex
CREATE INDEX "CombatParticipant_encounterId_idx" ON "CombatParticipant"("encounterId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "EnemyStatBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnemyStatBlock" ADD CONSTRAINT "EnemyStatBlock_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnemyStatBlock" ADD CONSTRAINT "EnemyStatBlock_portraitAssetId_fkey" FOREIGN KEY ("portraitAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatEncounter" ADD CONSTRAINT "CombatEncounter_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatEncounter" ADD CONSTRAINT "CombatEncounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GroupSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "CombatEncounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "CharacterSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatParticipant" ADD CONSTRAINT "CombatParticipant_enemyId_fkey" FOREIGN KEY ("enemyId") REFERENCES "EnemyStatBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
