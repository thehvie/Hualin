-- A delivery and its pickup are separate stops, so each can go to a different driver.
ALTER TABLE "RentalBooking" ADD COLUMN "deliveryDriverId" TEXT,
ADD COLUMN "pickupDriverId" TEXT;

CREATE INDEX "RentalBooking_deliveryDriverId_idx" ON "RentalBooking"("deliveryDriverId");
CREATE INDEX "RentalBooking_pickupDriverId_idx" ON "RentalBooking"("pickupDriverId");

ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_deliveryDriverId_fkey" FOREIGN KEY ("deliveryDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_pickupDriverId_fkey" FOREIGN KEY ("pickupDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
