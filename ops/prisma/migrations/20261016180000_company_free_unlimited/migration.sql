-- Platform owner's own company: every feature, no limits, never billed. Set by hand, no UI.
ALTER TABLE "Company" ADD COLUMN "freeUnlimited" BOOLEAN NOT NULL DEFAULT false;
