-- CreateEnum
CREATE TYPE "conversationType" AS ENUM ('AiChat', 'workflowChat');

-- AlterTable
ALTER TABLE "ClientInitialPermitInfo" ADD COLUMN     "conversationId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "conversationType" "conversationType";

-- AddForeignKey
ALTER TABLE "ClientInitialPermitInfo" ADD CONSTRAINT "ClientInitialPermitInfo_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
