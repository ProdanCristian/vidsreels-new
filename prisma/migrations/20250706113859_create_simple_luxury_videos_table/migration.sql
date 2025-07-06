/*
  Warnings:

  - You are about to drop the `Video` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VideoQualityLevel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VideoQualityLevel" DROP CONSTRAINT "VideoQualityLevel_videoId_fkey";

-- DropTable
DROP TABLE "Video";

-- DropTable
DROP TABLE "VideoQualityLevel";

-- CreateTable
CREATE TABLE "LuxuryVideos" (
    "id" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "mp4Url" TEXT NOT NULL,
    "hlsUrl" TEXT NOT NULL,

    CONSTRAINT "LuxuryVideos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LuxuryVideos_s3Key_key" ON "LuxuryVideos"("s3Key");

-- CreateIndex
CREATE INDEX "LuxuryVideos_s3Key_idx" ON "LuxuryVideos"("s3Key");
