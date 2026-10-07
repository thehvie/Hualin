-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "officeAddressLine1" TEXT,
ADD COLUMN     "officeCity" TEXT,
ADD COLUMN     "officeLatitude" DOUBLE PRECISION,
ADD COLUMN     "officeLongitude" DOUBLE PRECISION,
ADD COLUMN     "officeState" TEXT,
ADD COLUMN     "officeZip" TEXT;

-- Existing companies start with the original Haulin office address as their default
-- (editable in Settings). Companies created later start blank.
UPDATE "Company"
SET "officeAddressLine1" = '1375 Lake Shadow Cir',
    "officeCity" = 'Maitland',
    "officeState" = 'FL',
    "officeZip" = '32751';
