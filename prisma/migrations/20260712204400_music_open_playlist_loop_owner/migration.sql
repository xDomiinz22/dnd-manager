-- AlterTable
ALTER TABLE "MusicPlaylist" ADD COLUMN     "openToAll" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MusicTrack" ADD COLUMN     "addedByUserId" TEXT,
ADD COLUMN     "loop" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
