-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('text', 'file', 'audio');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answer" TEXT,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'text';
