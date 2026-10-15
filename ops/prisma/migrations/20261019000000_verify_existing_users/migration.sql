-- Email verification starts now. People who already have accounts are treated as verified.
UPDATE "User" SET "emailVerified" = NOW() WHERE "emailVerified" IS NULL;
