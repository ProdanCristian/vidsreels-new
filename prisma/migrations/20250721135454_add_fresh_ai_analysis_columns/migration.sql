-- AlterTable
ALTER TABLE "LuxuryVideos" ADD COLUMN     "analyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "appropriateForPlatform" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hasTextOverlay" BOOLEAN,
ADD COLUMN     "qualityAssessment" TEXT,
ADD COLUMN     "qualityIssues" JSONB,
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "removalReason" TEXT,
ADD COLUMN     "shouldRemove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "textContent" JSONB,
ADD COLUMN     "textOverlayConfidence" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "LuxuryVideos_analyzed_idx" ON "LuxuryVideos"("analyzed");

-- CreateIndex
CREATE INDEX "LuxuryVideos_shouldRemove_idx" ON "LuxuryVideos"("shouldRemove");

-- CreateIndex
CREATE INDEX "LuxuryVideos_qualityScore_idx" ON "LuxuryVideos"("qualityScore");
