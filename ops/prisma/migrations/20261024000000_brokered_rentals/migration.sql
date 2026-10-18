-- A rental can be filled by a partner vendor instead of one of our dumpsters.
ALTER TABLE "RentalBooking" ADD COLUMN "vendorId" TEXT,
ADD COLUMN "vendorCostCents" INTEGER,
ADD COLUMN "vendorOrderedAt" TIMESTAMP(3),
ADD COLUMN "vendorPaidAt" TIMESTAMP(3);

CREATE INDEX "RentalBooking_vendorId_idx" ON "RentalBooking"("vendorId");

ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
