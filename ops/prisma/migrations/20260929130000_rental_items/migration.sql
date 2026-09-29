-- AlterEnum
ALTER TYPE "PriceBookItemType" ADD VALUE 'RENTAL';

-- AlterTable
ALTER TABLE "EstimateLineItem" ADD COLUMN     "isRental" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InvoiceLineItem" ADD COLUMN     "isRental" BOOLEAN NOT NULL DEFAULT false;
