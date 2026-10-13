-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "paymentLinkLabel" TEXT,
ADD COLUMN     "paymentLinkOnEstimates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentLinkOnInvoices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "paymentLinkUrl" TEXT;
