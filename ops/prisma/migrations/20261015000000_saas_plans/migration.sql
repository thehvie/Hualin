-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'BASE', 'PLUS');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'STARTER',
ADD COLUMN "brandUpgrade" BOOLEAN NOT NULL DEFAULT false;

-- Companies that exist today (the platform owner's own company) keep every feature.
UPDATE "Company" SET "plan" = 'PLUS', "brandUpgrade" = true;

-- Anyone still on a trial without an end date gets 60 days from now.
UPDATE "Company" SET "trialEndsAt" = NOW() + INTERVAL '60 days'
WHERE "subscriptionStatus" = 'TRIALING' AND "trialEndsAt" IS NULL AND "stripeSubscriptionId" IS NULL;
