/*
  Warnings:

  - You are about to drop the column `title` on the `Faq` table. All the data in the column will be lost.
  - Added the required column `question` to the `Faq` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Faq" DROP COLUMN "title",
ADD COLUMN     "question" TEXT NOT NULL;
