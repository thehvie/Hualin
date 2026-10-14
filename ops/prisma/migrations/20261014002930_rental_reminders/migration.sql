-- CreateEnum
CREATE TYPE "RentalReminderStatus" AS ENUM ('DRAFT', 'SENT', 'SKIPPED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RentalProposalKind" AS ENUM ('EXTEND', 'PICKUP');

-- CreateEnum
CREATE TYPE "RentalProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "rentalQuietEndHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "rentalQuietStartHour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "rentalReminderAi" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rentalReminderAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rentalReminderHours" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "rentalRemindersOn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RentalReminder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "forEndAt" TIMESTAMP(3) NOT NULL,
    "status" "RentalReminderStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" TEXT,
    "body" TEXT NOT NULL,
    "note" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalProposal" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" "RentalProposalKind" NOT NULL,
    "newEndAt" TIMESTAMP(3),
    "extraDays" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "message" TEXT NOT NULL,
    "status" "RentalProposalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalReminder_companyId_status_idx" ON "RentalReminder"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RentalReminder_bookingId_kind_forEndAt_key" ON "RentalReminder"("bookingId", "kind", "forEndAt");

-- CreateIndex
CREATE INDEX "RentalProposal_companyId_status_idx" ON "RentalProposal"("companyId", "status");

-- CreateIndex
CREATE INDEX "RentalProposal_bookingId_idx" ON "RentalProposal"("bookingId");

-- AddForeignKey
ALTER TABLE "RentalReminder" ADD CONSTRAINT "RentalReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReminder" ADD CONSTRAINT "RentalReminder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "RentalBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalProposal" ADD CONSTRAINT "RentalProposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalProposal" ADD CONSTRAINT "RentalProposal_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "RentalBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
