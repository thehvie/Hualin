/*
  Warnings:

  - You are about to drop the column `estimateId` on the `Job` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_estimateId_fkey";

-- DropIndex
DROP INDEX "Invoice_jobId_key";

-- DropIndex
DROP INDEX "Job_estimateId_key";

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "jobId" TEXT;

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "estimateId";

-- CreateIndex
CREATE INDEX "Estimate_jobId_idx" ON "Estimate"("jobId");

-- CreateIndex
CREATE INDEX "Invoice_jobId_idx" ON "Invoice"("jobId");

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
