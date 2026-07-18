-- DropIndex
DROP INDEX "GroupMap_groupId_key";

-- AlterTable
ALTER TABLE "GroupMap" ADD COLUMN     "continent" TEXT,
ADD COLUMN     "isWorld" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Mundo';

-- AlterTable
ALTER TABLE "MapPin" ADD COLUMN     "linkedMapId" TEXT;

-- CreateIndex
CREATE INDEX "GroupMap_groupId_idx" ON "GroupMap"("groupId");

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_linkedMapId_fkey" FOREIGN KEY ("linkedMapId") REFERENCES "GroupMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DataMigration: cada grupo tenía como mucho un GroupMap (groupId era único
-- hasta esta migración), así que ese mapa único pasa a ser su mapa "Mundo".
UPDATE "GroupMap" SET "isWorld" = true;
