-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "mailFromEmail" TEXT,
ADD COLUMN     "mailgunApiKeyEnc" TEXT,
ADD COLUMN     "mailgunDomain" TEXT,
ADD COLUMN     "mailgunRegion" TEXT NOT NULL DEFAULT 'us',
ADD COLUMN     "mailgunSigningKeyEnc" TEXT,
ADD COLUMN     "sharedEmailExempt" BOOLEAN NOT NULL DEFAULT false;

-- Companies that already exist are grandfathered on the shared sender; new signups get the 60-day window.
UPDATE "Company" SET "sharedEmailExempt" = true;
