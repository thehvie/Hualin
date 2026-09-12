-- AlterTable
ALTER TABLE "PriceBookItem" ADD COLUMN     "bookable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bookingPriceCents" INTEGER,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "costCents" INTEGER,
ADD COLUMN     "modelNumber" TEXT,
ADD COLUMN     "number" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PriceBookItem_number_key" ON "PriceBookItem"("number");
