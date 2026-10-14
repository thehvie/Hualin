-- A customer can now ask for a swap-out from their private estimate link.
ALTER TYPE "RentalProposalKind" ADD VALUE 'SWAP';

-- AlterTable
ALTER TABLE "RentalProposal" ADD COLUMN "fromCustomer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RentalBooking" ADD COLUMN "swapRequested" BOOLEAN NOT NULL DEFAULT false;
