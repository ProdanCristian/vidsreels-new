/*
  Warnings:

  - You are about to drop the column `hlsManifestUrl` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `streamUrl` on the `Video` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[videoId,quality]` on the table `VideoQualityLevel` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quality` to the `VideoQualityLevel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "hlsManifestUrl",
DROP COLUMN "streamUrl",
ADD COLUMN     "aspectRatio" TEXT,
ADD COLUMN     "baseName" TEXT,
ADD COLUMN     "duration" DOUBLE PRECISION,
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "hlsMasterUrl" TEXT,
ADD COLUMN     "mp4Url" TEXT,
ADD COLUMN     "sizeBytes" BIGINT,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "VideoQualityLevel" ADD COLUMN     "quality" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Video_baseName_idx" ON "Video"("baseName");

-- CreateIndex
CREATE INDEX "Video_filename_idx" ON "Video"("filename");

-- CreateIndex
CREATE INDEX "VideoQualityLevel_quality_idx" ON "VideoQualityLevel"("quality");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQualityLevel_videoId_quality_key" ON "VideoQualityLevel"("videoId", "quality");
