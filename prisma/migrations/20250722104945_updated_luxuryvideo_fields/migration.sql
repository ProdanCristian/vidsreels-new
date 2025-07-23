/*
  Warnings:

  - You are about to drop the column `analyzed` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `analyzedAt` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `appropriateForPlatform` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `contentType` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `hasTextOverlay` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `qualityAssessment` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `qualityIssues` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `qualityScore` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `removalReason` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `shouldRemove` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `textContent` on the `LuxuryVideos` table. All the data in the column will be lost.
  - You are about to drop the column `textOverlayConfidence` on the `LuxuryVideos` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "LuxuryVideos_analyzed_idx";

-- DropIndex
DROP INDEX "LuxuryVideos_qualityScore_idx";

-- DropIndex
DROP INDEX "LuxuryVideos_shouldRemove_idx";

-- AlterTable
ALTER TABLE "LuxuryVideos" DROP COLUMN "analyzed",
DROP COLUMN "analyzedAt",
DROP COLUMN "appropriateForPlatform",
DROP COLUMN "contentType",
DROP COLUMN "hasTextOverlay",
DROP COLUMN "qualityAssessment",
DROP COLUMN "qualityIssues",
DROP COLUMN "qualityScore",
DROP COLUMN "removalReason",
DROP COLUMN "shouldRemove",
DROP COLUMN "textContent",
DROP COLUMN "textOverlayConfidence",
ADD COLUMN     "categories" TEXT[],
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dominantColors" TEXT[],
ADD COLUMN     "mood" TEXT[],
ADD COLUMN     "objects" TEXT[],
ADD COLUMN     "setting" TEXT[],
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "LuxuryVideos_tags_idx" ON "LuxuryVideos"("tags");

-- CreateIndex
CREATE INDEX "LuxuryVideos_categories_idx" ON "LuxuryVideos"("categories");
