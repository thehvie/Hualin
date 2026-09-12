-- CreateEnum
CREATE TYPE "DumpsterUnitStatus" AS ENUM ('AVAILABLE', 'OUT', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DumpsterRentalStatus" AS ENUM ('SCHEDULED', 'DELIVERED', 'PICKED_UP', 'CANCELLED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "dumpsterRentalId" TEXT;

-- CreateTable
CREATE TABLE "DumpsterUnit" (
    "id" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "status" "DumpsterUnitStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DumpsterUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DumpsterRental" (
    "id" TEXT NOT NULL,
    "dumpsterUnitId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "estimateId" TEXT,
    "status" "DumpsterRentalStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "scheduledPickupAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DumpsterRental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DumpsterUnit_unitNumber_key" ON "DumpsterUnit"("unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DumpsterRental_estimateId_key" ON "DumpsterRental"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_dumpsterRentalId_key" ON "Invoice"("dumpsterRentalId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_dumpsterRentalId_fkey" FOREIGN KEY ("dumpsterRentalId") REFERENCES "DumpsterRental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DumpsterRental" ADD CONSTRAINT "DumpsterRental_dumpsterUnitId_fkey" FOREIGN KEY ("dumpsterUnitId") REFERENCES "DumpsterUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DumpsterRental" ADD CONSTRAINT "DumpsterRental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DumpsterRental" ADD CONSTRAINT "DumpsterRental_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DumpsterRental" ADD CONSTRAINT "DumpsterRental_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
