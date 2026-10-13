-- Show every US phone number as 407.555.0123. Numbers that aren't 10 digits (international, extensions typed into the
-- number) are left exactly as they were.
UPDATE "Customer"
SET "phone" = regexp_replace(regexp_replace("phone", '\D', '', 'g'), '^1?(\d{3})(\d{3})(\d{4})$', '\1.\2.\3')
WHERE "phone" IS NOT NULL AND regexp_replace("phone", '\D', '', 'g') ~ '^1?\d{10}$';

UPDATE "Customer"
SET "secondaryPhone" = regexp_replace(regexp_replace("secondaryPhone", '\D', '', 'g'), '^1?(\d{3})(\d{3})(\d{4})$', '\1.\2.\3')
WHERE "secondaryPhone" IS NOT NULL AND regexp_replace("secondaryPhone", '\D', '', 'g') ~ '^1?\d{10}$';

UPDATE "Vendor"
SET "phone" = regexp_replace(regexp_replace("phone", '\D', '', 'g'), '^1?(\d{3})(\d{3})(\d{4})$', '\1.\2.\3')
WHERE "phone" IS NOT NULL AND regexp_replace("phone", '\D', '', 'g') ~ '^1?\d{10}$';

UPDATE "Vendor"
SET "secondaryPhone" = regexp_replace(regexp_replace("secondaryPhone", '\D', '', 'g'), '^1?(\d{3})(\d{3})(\d{4})$', '\1.\2.\3')
WHERE "secondaryPhone" IS NOT NULL AND regexp_replace("secondaryPhone", '\D', '', 'g') ~ '^1?\d{10}$';

UPDATE "Company"
SET "phone" = regexp_replace(regexp_replace("phone", '\D', '', 'g'), '^1?(\d{3})(\d{3})(\d{4})$', '\1.\2.\3')
WHERE "phone" IS NOT NULL AND regexp_replace("phone", '\D', '', 'g') ~ '^1?\d{10}$';
