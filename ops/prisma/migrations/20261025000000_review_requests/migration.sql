-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "reviewLinkUrl" TEXT,
ADD COLUMN     "reviewRequestDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "reviewRequestsOn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewRequestsSince" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "reviewRequestNote" TEXT,
ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);
