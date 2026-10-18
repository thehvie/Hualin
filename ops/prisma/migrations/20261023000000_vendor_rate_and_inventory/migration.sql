-- Our percentage with each partner vendor, and how many of each size they have.
ALTER TABLE "Vendor" ADD COLUMN "ourRatePercent" DOUBLE PRECISION;
ALTER TABLE "VendorRate" ADD COLUMN "inventory" INTEGER,
ADD COLUMN "inventoryUpdatedAt" TIMESTAMP(3);
