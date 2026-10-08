-- AlterTable
ALTER TABLE "UsageEvent" ADD COLUMN     "ref" TEXT;

-- CreateIndex
CREATE INDEX "UsageEvent_companyId_service_ref_createdAt_idx" ON "UsageEvent"("companyId", "service", "ref", "createdAt");
