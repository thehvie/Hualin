-- AlterTable
ALTER TABLE "CommunicationAttachment" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "data" DROP NOT NULL;
