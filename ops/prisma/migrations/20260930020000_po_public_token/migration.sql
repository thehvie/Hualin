-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "publicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_publicToken_key" ON "PurchaseOrder"("publicToken");
