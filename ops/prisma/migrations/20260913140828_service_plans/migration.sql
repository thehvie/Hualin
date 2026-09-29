-- CreateEnum
CREATE TYPE "ServicePlanDurationUnit" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "ServicePlanBillingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "ServicePlanSubscriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "DumpsterRental" DROP CONSTRAINT "DumpsterRental_companyId_fkey";

-- DropForeignKey
ALTER TABLE "DumpsterRental" DROP CONSTRAINT "DumpsterRental_customerId_fkey";

-- DropForeignKey
ALTER TABLE "DumpsterRental" DROP CONSTRAINT "DumpsterRental_dumpsterUnitId_fkey";

-- DropForeignKey
ALTER TABLE "DumpsterRental" DROP CONSTRAINT "DumpsterRental_estimateId_fkey";

-- DropForeignKey
ALTER TABLE "DumpsterRental" DROP CONSTRAINT "DumpsterRental_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "DumpsterUnit" DROP CONSTRAINT "DumpsterUnit_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_dumpsterRentalId_fkey";

-- DropIndex
DROP INDEX "Invoice_dumpsterRentalId_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "stripeCustomerId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "dumpsterRentalId",
ADD COLUMN     "servicePlanSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "stripeInvoiceId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- DropTable
DROP TABLE "DumpsterRental";

-- DropTable
DROP TABLE "DumpsterUnit";

-- DropEnum
DROP TYPE "DumpsterRentalStatus";

-- DropEnum
DROP TYPE "DumpsterUnitStatus";

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeOfWork" TEXT,
    "durationValue" INTEGER NOT NULL,
    "durationUnit" "ServicePlanDurationUnit" NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "visitsPerPeriod" INTEGER NOT NULL,
    "jobTypeId" TEXT,
    "priceCents" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "stripeProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlanBillingOption" (
    "id" TEXT NOT NULL,
    "servicePlanId" TEXT NOT NULL,
    "frequency" "ServicePlanBillingFrequency" NOT NULL,
    "discountPercent" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServicePlanBillingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePlanSubscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "servicePlanId" TEXT NOT NULL,
    "billingOptionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyId" TEXT,
    "status" "ServicePlanSubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "priceCentsSnapshot" INTEGER NOT NULL,
    "visitsTotal" INTEGER NOT NULL,
    "visitsUsed" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "nextVisitDate" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePlanSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePlan_companyId_idx" ON "ServicePlan"("companyId");

-- CreateIndex
CREATE INDEX "ServicePlanBillingOption_servicePlanId_idx" ON "ServicePlanBillingOption"("servicePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePlanSubscription_stripeSubscriptionId_key" ON "ServicePlanSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ServicePlanSubscription_companyId_idx" ON "ServicePlanSubscription"("companyId");

-- CreateIndex
CREATE INDEX "ServicePlanSubscription_customerId_idx" ON "ServicePlanSubscription"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_servicePlanSubscriptionId_idx" ON "Invoice"("servicePlanSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeInvoiceId_key" ON "Payment"("stripeInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_servicePlanSubscriptionId_fkey" FOREIGN KEY ("servicePlanSubscriptionId") REFERENCES "ServicePlanSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "PriceBookItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanBillingOption" ADD CONSTRAINT "ServicePlanBillingOption_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_billingOptionId_fkey" FOREIGN KEY ("billingOptionId") REFERENCES "ServicePlanBillingOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlanSubscription" ADD CONSTRAINT "ServicePlanSubscription_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
