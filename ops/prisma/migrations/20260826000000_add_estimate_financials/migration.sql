-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "depositCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "laborCostCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EstimateLineItem" ADD COLUMN     "costCents" INTEGER;

-- CreateTable
CREATE TABLE "EstimatePaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimatePaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EstimatePaymentScheduleItem" ADD CONSTRAINT "EstimatePaymentScheduleItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
