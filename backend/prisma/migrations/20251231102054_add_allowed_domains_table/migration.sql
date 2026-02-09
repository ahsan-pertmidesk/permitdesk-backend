-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platfromAccess" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "AllowedDomains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AllowedDomains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedDomains_domain_key" ON "AllowedDomains"("domain");
