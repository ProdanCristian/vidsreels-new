-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "hlsAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hlsManifestUrl" TEXT,
ADD COLUMN     "streamingType" TEXT NOT NULL DEFAULT 'mp4';

-- CreateTable
CREATE TABLE "VideoQualityLevel" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "bitrate" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "manifestUrl" TEXT NOT NULL,

    CONSTRAINT "VideoQualityLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoQualityLevel_videoId_idx" ON "VideoQualityLevel"("videoId");

-- CreateIndex
CREATE INDEX "Video_hlsAvailable_idx" ON "Video"("hlsAvailable");

-- CreateIndex
CREATE INDEX "Video_streamingType_idx" ON "Video"("streamingType");

-- AddForeignKey
ALTER TABLE "VideoQualityLevel" ADD CONSTRAINT "VideoQualityLevel_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
