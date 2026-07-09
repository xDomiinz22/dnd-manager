-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "characterId" TEXT;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "CharacterSheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
