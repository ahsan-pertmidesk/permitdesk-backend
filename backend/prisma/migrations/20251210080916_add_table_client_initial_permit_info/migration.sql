-- CreateTable
CREATE TABLE "ClientInitialPermitInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "stepId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "workflowId" TEXT NOT NULL,
    "clientAns" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ClientInitialPermitInfo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientInitialPermitInfo" ADD CONSTRAINT "ClientInitialPermitInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInitialPermitInfo" ADD CONSTRAINT "ClientInitialPermitInfo_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInitialPermitInfo" ADD CONSTRAINT "ClientInitialPermitInfo_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
