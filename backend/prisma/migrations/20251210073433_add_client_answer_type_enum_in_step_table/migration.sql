-- CreateEnum
CREATE TYPE "ClientAnswerType" AS ENUM ('singleInput', 'multipleInput');

-- AlterTable
ALTER TABLE "Steps" ADD COLUMN     "clientAnswerType" "ClientAnswerType";
