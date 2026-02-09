-- CreateTable
CREATE TABLE "WorkFlow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WorkFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Steps" (
    "id" TEXT NOT NULL,
    "no" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "questionOptions" TEXT[],
    "workflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitInitialInfo" (
    "id" TEXT NOT NULL,
    "permitFileURl" TEXT,
    "projectLocation" TEXT,
    "buildingType" TEXT,
    "buildingUseCase" TEXT,
    "buildingSquareFeet" TEXT,
    "stageOfDesign" TEXT NOT NULL,
    "buildingStory" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PermitInitialInfo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Steps" ADD CONSTRAINT "Steps_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkFlow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
