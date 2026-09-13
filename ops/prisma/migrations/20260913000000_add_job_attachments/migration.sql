-- Photos attached to a Job (e.g. uploaded during online booking). Stored as
-- base64 data URLs, same pattern as Company.logoDataUrl / InvoiceSignature —
-- no file-storage backend exists in this self-hosted setup yet.

CREATE TABLE "JobAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobAttachment_companyId_idx" ON "JobAttachment"("companyId");
CREATE INDEX "JobAttachment_jobId_idx" ON "JobAttachment"("jobId");

ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobAttachment" ADD CONSTRAINT "JobAttachment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
