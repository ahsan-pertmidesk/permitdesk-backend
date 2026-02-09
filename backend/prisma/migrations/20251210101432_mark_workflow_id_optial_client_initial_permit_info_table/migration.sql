-- DropForeignKey
ALTER TABLE "public"."ClientInitialPermitInfo" DROP CONSTRAINT "ClientInitialPermitInfo_workflowId_fkey";

-- AlterTable
ALTER TABLE "ClientInitialPermitInfo" ALTER COLUMN "stepNumber" DROP NOT NULL,
ALTER COLUMN "workflowId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ClientInitialPermitInfo" ADD CONSTRAINT "ClientInitialPermitInfo_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkFlow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
