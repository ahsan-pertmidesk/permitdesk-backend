-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "stepId" TEXT;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
