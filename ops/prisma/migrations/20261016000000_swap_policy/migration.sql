-- CreateEnum
CREATE TYPE "SwapPolicy" AS ENUM ('OFF', 'FREE', 'FLAT', 'FULL');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "swapPolicy" "SwapPolicy" NOT NULL DEFAULT 'OFF',
ADD COLUMN "swapFeeCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RentalBooking" ADD COLUMN "swapFeeCents" INTEGER NOT NULL DEFAULT 0;
