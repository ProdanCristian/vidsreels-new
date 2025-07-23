/*
  Warnings:

  - You are about to drop the column `description` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `flaggedForReview` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `hasTextOrCaption` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `qualityScore` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `reviewReason` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `textContent` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `textOrCaptionConfidence` on the `LuxuryVideos` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LuxuryVideos_flaggedForReview_idx";

-- DropIndex
DROP INDEX "LuxuryVideos_qualityScore_idx";

-- AlterTable
ALTER TABLE "LuxuryVideos" DROP COLUMN "description",
DROP COLUMN "flaggedForReview",
DROP COLUMN "hasTextOrCaption",
DROP COLUMN "qualityScore",
DROP COLUMN "reviewReason",
DROP COLUMN "textContent",
DROP COLUMN "textOrCaptionConfidence",
ADD COLUMN     "videoLength" INTEGER;

-- CreateIndex
CREATE INDEX "LuxuryVideos_isAnalyzed_idx" ON "LuxuryVideos"("isAnalyzed");
