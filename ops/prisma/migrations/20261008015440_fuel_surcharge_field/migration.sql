-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "fuelSurchargeCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "fuelSurchargeCents" INTEGER NOT NULL DEFAULT 0;
