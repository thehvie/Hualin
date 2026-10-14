-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");
CREATE INDEX "CustomerContact_companyId_idx" ON "CustomerContact"("companyId");

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN "contactId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "contactId" TEXT;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CustomerContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
