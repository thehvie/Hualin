-- AlterTable
ALTER TABLE "Company" ADD COLUMN "smsCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SmsPackPurchase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "texts" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsPackPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsPackPurchase_companyId_idx" ON "SmsPackPurchase"("companyId");

-- AddForeignKey
ALTER TABLE "SmsPackPurchase" ADD CONSTRAINT "SmsPackPurchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
