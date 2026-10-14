-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "emailOn" BOOLEAN NOT NULL DEFAULT true,
    "emailSubject" TEXT NOT NULL,
    "emailHeadline" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,
    "smsOn" BOOLEAN NOT NULL DEFAULT false,
    "smsBody" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_companyId_key_key" ON "MessageTemplate"("companyId", "key");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
