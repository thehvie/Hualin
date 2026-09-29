-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "signatureDataUrl" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedIp" TEXT,
ADD COLUMN     "signedName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_publicToken_key" ON "Estimate"("publicToken");
