-- CreateEnum
CREATE TYPE "WorkFlowStatus" AS ENUM ('notStarted', 'started', 'completed');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "workFlowStatus" "WorkFlowStatus" NOT NULL DEFAULT 'notStarted';
