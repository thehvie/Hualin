// Safe to import from client components (no database or server-only imports).

/** How long a new company may send from the shared platform address before it must connect its own Mailgun. */
export const SHARED_EMAIL_DAYS = 60;
/** Start showing a countdown this many days before the shared sender ends. */
export const SHARED_EMAIL_WARN_DAYS = 14;
