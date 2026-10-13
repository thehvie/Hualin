-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "depositPaidAt" TIMESTAMP(3),
ADD COLUMN     "depositPaidCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositPaidMethod" "PaymentMethod",
ADD COLUMN     "depositPaidReference" TEXT;
