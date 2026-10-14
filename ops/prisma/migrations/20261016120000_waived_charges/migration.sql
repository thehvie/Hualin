-- Charges the office chose not to bill for a rental: any of SWAP, EXTRA_DAYS, OVERWEIGHT.
ALTER TABLE "RentalBooking" ADD COLUMN "waivedCharges" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "RentalBooking" SET "waivedCharges" = ARRAY[]::TEXT[] WHERE "waivedCharges" IS NULL;
ALTER TABLE "RentalBooking" ALTER COLUMN "waivedCharges" SET NOT NULL;
