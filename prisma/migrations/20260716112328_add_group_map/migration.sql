-- CreateTable
CREATE TABLE "GroupMap" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPin" (
    "id" TEXT NOT NULL,
    "groupMapId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "journalPageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupMap_groupId_key" ON "GroupMap"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMap_assetId_key" ON "GroupMap"("assetId");

-- AddForeignKey
ALTER TABLE "GroupMap" ADD CONSTRAINT "GroupMap_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMap" ADD CONSTRAINT "GroupMap_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_groupMapId_fkey" FOREIGN KEY ("groupMapId") REFERENCES "GroupMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPin" ADD CONSTRAINT "MapPin_journalPageId_fkey" FOREIGN KEY ("journalPageId") REFERENCES "JournalPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
