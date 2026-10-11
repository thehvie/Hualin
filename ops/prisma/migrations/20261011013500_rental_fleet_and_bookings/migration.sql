-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('DUMPSTER', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ON_RENT', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('RESERVED', 'DELIVERED', 'PICKUP_REQUESTED', 'PICKED_UP', 'CANCELLED');

-- AlterTable
ALTER TABLE "PriceBookItem" ADD COLUMN     "assetCategory" TEXT,
ADD COLUMN     "extraDayCents" INTEGER,
ADD COLUMN     "includedTons" DOUBLE PRECISION,
ADD COLUMN     "overageCentsPerTon" INTEGER,
ADD COLUMN     "packageDays" INTEGER;

-- CreateTable
CREATE TABLE "RentalAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL DEFAULT 'DUMPSTER',
    "label" TEXT NOT NULL,
    "category" TEXT,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalBooking" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assetId" TEXT,
    "category" TEXT,
    "priceBookItemId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'RESERVED',
    "deliveredAt" TIMESTAMP(3),
    "pickupRequestedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "placementNotes" TEXT,
    "weightTons" DOUBLE PRECISION,
    "ticketNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalAsset_companyId_idx" ON "RentalAsset"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalAsset_companyId_label_key" ON "RentalAsset"("companyId", "label");

-- CreateIndex
CREATE INDEX "RentalBooking_companyId_idx" ON "RentalBooking"("companyId");

-- CreateIndex
CREATE INDEX "RentalBooking_jobId_idx" ON "RentalBooking"("jobId");

-- CreateIndex
CREATE INDEX "RentalBooking_assetId_startAt_endAt_idx" ON "RentalBooking"("assetId", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "RentalAsset" ADD CONSTRAINT "RentalAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "RentalAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
