-- Company profile fields for the PDF header (logo, website, contact info).
-- All nullable — no backfill needed.

ALTER TABLE "Company" ADD COLUMN "logoDataUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "website" TEXT;
ALTER TABLE "Company" ADD COLUMN "email" TEXT;
ALTER TABLE "Company" ADD COLUMN "phone" TEXT;
