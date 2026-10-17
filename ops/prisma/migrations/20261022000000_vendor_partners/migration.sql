-- Brokering: dumpster partner vendors and their per-size rates.
ALTER TABLE "Vendor" ADD COLUMN "dumpsterPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "serviceAreas" TEXT,
ADD COLUMN "partnerNotes" TEXT;

CREATE TABLE "VendorRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "sellCents" INTEGER NOT NULL,
    "packageDays" INTEGER,
    "includedTons" DOUBLE PRECISION,
    "extraDayCents" INTEGER,
    "overageCentsPerTon" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorRate_vendorId_size_key" ON "VendorRate"("vendorId", "size");
CREATE INDEX "VendorRate_companyId_idx" ON "VendorRate"("companyId");

ALTER TABLE "VendorRate" ADD CONSTRAINT "VendorRate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
