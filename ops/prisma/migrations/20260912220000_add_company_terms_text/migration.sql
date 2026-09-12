-- Editable Terms & Conditions text shown on estimate/invoice PDFs.
-- Nullable — falls back to a built-in default when empty.

ALTER TABLE "Company" ADD COLUMN "termsText" TEXT;
