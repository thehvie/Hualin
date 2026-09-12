-- ============================================================================
-- Multi-tenancy retrofit.
--
-- Hand-written (not a straight `prisma migrate dev` diff) because this adds a
-- required `companyId` column to every business-data table against a
-- database that already has live HAULINJUNKIES data. Sequenced as:
--   A) create Company + SubscriptionStatus
--   B) seed a single Company row for the existing business ("tenant #1")
--   C) add companyId columns as NULLABLE
--   D) backfill every existing row to that company's id
--   E) make companyId NOT NULL, add FKs + indexes
--   F) tighten DumpsterUnit.unitNumber uniqueness to be per-company
-- All in one transaction (Prisma migrations already run inside one), which is
-- fine at this data volume.
-- ============================================================================

-- ── A) Company / SubscriptionStatus ─────────────────────────────────────────

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'PAUSED');

CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");
CREATE UNIQUE INDEX "Company_stripeSubscriptionId_key" ON "Company"("stripeSubscriptionId");

-- ── B) Seed tenant #1 for existing data ─────────────────────────────────────

INSERT INTO "Company" ("id", "name", "subscriptionStatus", "createdAt", "updatedAt")
VALUES ('company_haulinjunkies', 'Haulin Junkies', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── C) Add companyId as nullable everywhere ─────────────────────────────────

ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Property" ADD COLUMN "companyId" TEXT;
ALTER TABLE "PriceBookItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Estimate" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EstimateLineItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EstimatePaymentScheduleItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Job" ADD COLUMN "companyId" TEXT;
ALTER TABLE "TaxRate" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "companyId" TEXT;
ALTER TABLE "InvoiceLineItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "InvoicePaymentScheduleItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "InvoiceAttachment" ADD COLUMN "companyId" TEXT;
ALTER TABLE "InvoiceSignature" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EquipmentItem" ADD COLUMN "companyId" TEXT;
ALTER TABLE "EquipmentUsage" ADD COLUMN "companyId" TEXT;
ALTER TABLE "DumpsterUnit" ADD COLUMN "companyId" TEXT;
ALTER TABLE "DumpsterRental" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Communication" ADD COLUMN "companyId" TEXT;

-- ── D) Backfill every existing row to tenant #1 ─────────────────────────────

UPDATE "User" SET "companyId" = 'company_haulinjunkies';
UPDATE "Customer" SET "companyId" = 'company_haulinjunkies';
UPDATE "Property" SET "companyId" = 'company_haulinjunkies';
UPDATE "PriceBookItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "Estimate" SET "companyId" = 'company_haulinjunkies';
UPDATE "EstimateLineItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "EstimatePaymentScheduleItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "Job" SET "companyId" = 'company_haulinjunkies';
UPDATE "TaxRate" SET "companyId" = 'company_haulinjunkies';
UPDATE "Invoice" SET "companyId" = 'company_haulinjunkies';
UPDATE "InvoiceLineItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "InvoicePaymentScheduleItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "InvoiceAttachment" SET "companyId" = 'company_haulinjunkies';
UPDATE "InvoiceSignature" SET "companyId" = 'company_haulinjunkies';
UPDATE "Payment" SET "companyId" = 'company_haulinjunkies';
UPDATE "EquipmentItem" SET "companyId" = 'company_haulinjunkies';
UPDATE "EquipmentUsage" SET "companyId" = 'company_haulinjunkies';
UPDATE "DumpsterUnit" SET "companyId" = 'company_haulinjunkies';
UPDATE "DumpsterRental" SET "companyId" = 'company_haulinjunkies';
UPDATE "Communication" SET "companyId" = 'company_haulinjunkies';

-- ── E) NOT NULL + FKs + indexes ──────────────────────────────────────────────

ALTER TABLE "User" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

ALTER TABLE "Customer" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
DROP INDEX "Customer_lastName_firstName_idx";
CREATE INDEX "Customer_companyId_lastName_firstName_idx" ON "Customer"("companyId", "lastName", "firstName");

ALTER TABLE "Property" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Property" ADD CONSTRAINT "Property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Property_companyId_idx" ON "Property"("companyId");

ALTER TABLE "PriceBookItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "PriceBookItem" ADD CONSTRAINT "PriceBookItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PriceBookItem_companyId_idx" ON "PriceBookItem"("companyId");

ALTER TABLE "Estimate" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Estimate_companyId_idx" ON "Estimate"("companyId");

ALTER TABLE "EstimateLineItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EstimateLineItem_companyId_idx" ON "EstimateLineItem"("companyId");

ALTER TABLE "EstimatePaymentScheduleItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EstimatePaymentScheduleItem" ADD CONSTRAINT "EstimatePaymentScheduleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EstimatePaymentScheduleItem_companyId_idx" ON "EstimatePaymentScheduleItem"("companyId");

ALTER TABLE "Job" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

ALTER TABLE "TaxRate" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "TaxRate_companyId_idx" ON "TaxRate"("companyId");

ALTER TABLE "Invoice" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

ALTER TABLE "InvoiceLineItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InvoiceLineItem_companyId_idx" ON "InvoiceLineItem"("companyId");

ALTER TABLE "InvoicePaymentScheduleItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoicePaymentScheduleItem" ADD CONSTRAINT "InvoicePaymentScheduleItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InvoicePaymentScheduleItem_companyId_idx" ON "InvoicePaymentScheduleItem"("companyId");

ALTER TABLE "InvoiceAttachment" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InvoiceAttachment_companyId_idx" ON "InvoiceAttachment"("companyId");

ALTER TABLE "InvoiceSignature" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "InvoiceSignature" ADD CONSTRAINT "InvoiceSignature_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InvoiceSignature_companyId_idx" ON "InvoiceSignature"("companyId");

ALTER TABLE "Payment" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

ALTER TABLE "EquipmentItem" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EquipmentItem" ADD CONSTRAINT "EquipmentItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EquipmentItem_companyId_idx" ON "EquipmentItem"("companyId");

ALTER TABLE "EquipmentUsage" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "EquipmentUsage" ADD CONSTRAINT "EquipmentUsage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "EquipmentUsage_companyId_idx" ON "EquipmentUsage"("companyId");

ALTER TABLE "DumpsterUnit" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "DumpsterUnit" ADD CONSTRAINT "DumpsterUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DumpsterRental" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "DumpsterRental" ADD CONSTRAINT "DumpsterRental_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "DumpsterRental_companyId_idx" ON "DumpsterRental"("companyId");

ALTER TABLE "Communication" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Communication_companyId_idx" ON "Communication"("companyId");

-- ── F) DumpsterUnit.unitNumber → unique per company ─────────────────────────
-- Safe post-backfill: only one company exists so far, so no collision is possible.

DROP INDEX "DumpsterUnit_unitNumber_key";
CREATE UNIQUE INDEX "DumpsterUnit_companyId_unitNumber_key" ON "DumpsterUnit"("companyId", "unitNumber");
