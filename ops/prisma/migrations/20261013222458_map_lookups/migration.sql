-- CreateTable
CREATE TABLE "MapLookup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MapLookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapLookup_companyId_createdAt_idx" ON "MapLookup"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "MapLookup" ADD CONSTRAINT "MapLookup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
