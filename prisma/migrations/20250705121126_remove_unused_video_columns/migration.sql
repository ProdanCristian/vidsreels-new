/*
  Warnings:

  - You are about to drop the column `directUrl` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `embedUrl` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Video" DROP COLUMN "directUrl",
DROP COLUMN "embedUrl",
DROP COLUMN "name";
