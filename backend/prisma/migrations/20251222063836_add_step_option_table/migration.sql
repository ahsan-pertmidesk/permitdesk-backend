-- CreateTable
CREATE TABLE "StepOption" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "stepOptionArray" TEXT[],

    CONSTRAINT "StepOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StepOption" ADD CONSTRAINT "StepOption_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
