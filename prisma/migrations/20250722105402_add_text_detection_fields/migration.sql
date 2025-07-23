-- AlterTable
ALTER TABLE "LuxuryVideos" ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTextOrCaption" BOOLEAN,
ADD COLUMN     "isAnalyzed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualityScore" DOUBLE PRECISION,
ADD COLUMN     "reviewReason" TEXT,
ADD COLUMN     "textContent" TEXT[],
ADD COLUMN     "textOrCaptionConfidence" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "LuxuryVideos_qualityScore_idx" ON "LuxuryVideos"("qualityScore");

-- CreateIndex
CREATE INDEX "LuxuryVideos_flaggedForReview_idx" ON "LuxuryVideos"("flaggedForReview");
