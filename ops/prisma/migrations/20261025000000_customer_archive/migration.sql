-- Archive customers instead of deleting ones with history.
ALTER TABLE "Customer" ADD COLUMN "archivedAt" TIMESTAMP(3);
