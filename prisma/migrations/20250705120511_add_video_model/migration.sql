-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "streamUrl" TEXT NOT NULL,
    "directUrl" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "collection" TEXT NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Video_s3Key_key" ON "Video"("s3Key");

-- CreateIndex
CREATE INDEX "Video_collection_idx" ON "Video"("collection");

-- CreateIndex
CREATE INDEX "Video_lastModified_idx" ON "Video"("lastModified");
