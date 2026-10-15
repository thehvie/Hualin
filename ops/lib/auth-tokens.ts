import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailgun";

// One-time links for password reset and email verification. Uses NextAuth's VerificationToken table: the raw token
// only ever lives in the emailed link, and only its hash is stored, so a database leak doesn't hand out live links.

export type TokenKind = "reset" | "verify";

const TTL_MS: Record<TokenKind, number> = { reset: 60 * 60 * 1000, verify: 3 * 24 * 60 * 60 * 1000 };

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
const identifier = (kind: TokenKind, email: string) => `${kind}:${email.trim().toLowerCase()}`;

export const appOrigin = () => (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

/** Makes a fresh link token for an email address, replacing any earlier one of the same kind. */
export async function createAuthToken(kind: TokenKind, email: string): Promise<string> {
  const id = identifier(kind, email);
  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.deleteMany({ where: { identifier: id } });
  await prisma.verificationToken.create({ data: { identifier: id, token: hash(raw), expires: new Date(Date.now() + TTL_MS[kind]) } });
  return raw;
}

async function find(kind: TokenKind, raw: string) {
  if (!raw || raw.length > 200) return null;
  const row = await prisma.verificationToken.findUnique({ where: { token: hash(raw) } });
  if (!row || !row.identifier.startsWith(`${kind}:`) || row.expires.getTime() < Date.now()) return null;
  return row;
}

/** The email a valid token belongs to, without using it up. */
export async function peekAuthToken(kind: TokenKind, raw: string): Promise<string | null> {
  const row = await find(kind, raw);
  return row ? row.identifier.slice(kind.length + 1) : null;
}

/** The email a valid token belongs to; the token can't be used again. */
export async function consumeAuthToken(kind: TokenKind, raw: string): Promise<string | null> {
  const row = await find(kind, raw);
  if (!row) return null;
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: row.token } });
  return count === 1 ? row.identifier.slice(kind.length + 1) : null;
}

/** Account mail comes from the platform sender, not any company's. Failures are logged, never thrown. */
async function sendAccountEmail(to: string, subject: string, text: string): Promise<boolean> {
  try {
    await sendEmail({ to, subject, text });
    return true;
  } catch (err) {
    console.error("[account email] failed", err);
    return false;
  }
}

export async function sendVerificationEmail(email: string, name: string | null): Promise<boolean> {
  const token = await createAuthToken("verify", email);
  return sendAccountEmail(
    email,
    "Verify your email address",
    `Hi ${name || "there"},\n\nConfirm your email address to start sending estimates, invoices and messages to your customers:\n\n${appOrigin()}/verify-email/${token}\n\nThe link works for 3 days. If you didn't create an account, ignore this email.`,
  );
}

export async function sendResetEmail(email: string, name: string | null): Promise<boolean> {
  const token = await createAuthToken("reset", email);
  return sendAccountEmail(
    email,
    "Reset your password",
    `Hi ${name || "there"},\n\nSomeone asked to reset the password for this account. Choose a new one here:\n\n${appOrigin()}/reset-password/${token}\n\nThe link works for 1 hour and only once. If this wasn't you, ignore this email and your password stays the same.`,
  );
}
