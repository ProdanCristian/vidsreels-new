/*
  Warnings:

  - You are about to drop the column `hlsUrl` on the `LuxuryVideos` table. All the data in the column will be lost.
  - The column `mp4Url` on the `LuxuryVideos` table will be renamed to `videoUrl`.

*/
-- AlterTable: Drop hlsUrl column and rename mp4Url to videoUrl
ALTER TABLE "LuxuryVideos" DROP COLUMN "hlsUrl";
ALTER TABLE "LuxuryVideos" RENAME COLUMN "mp4Url" TO "videoUrl";
