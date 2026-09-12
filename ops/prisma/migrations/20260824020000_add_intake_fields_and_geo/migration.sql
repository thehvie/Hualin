-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "allowBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneExt" TEXT,
ADD COLUMN     "secondaryPhone" TEXT,
ADD COLUMN     "secondaryPhoneExt" TEXT,
ADD COLUMN     "taxExempt" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
