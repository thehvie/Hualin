import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secrets";

import { SHARED_EMAIL_DAYS, SHARED_EMAIL_WARN_DAYS } from "@/lib/mail-config-constants";

export { SHARED_EMAIL_DAYS, SHARED_EMAIL_WARN_DAYS };

export class SharedEmailExpiredError extends Error {
  constructor() {
    super(
      `Your ${SHARED_EMAIL_DAYS}-day trial of the shared email sender has ended. Connect your own Mailgun account in Settings → Email to keep sending email.`,
    );
    this.name = "SharedEmailExpiredError";
  }
}

export interface MailConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
  apiBase: string;
  /** True when this is the company's own Mailgun account rather than the shared platform sender. */
  own: boolean;
}

export type SharedEmailStatus =
  | { mode: "own"; domain: string }
  | { mode: "exempt" }
  | { mode: "shared"; daysLeft: number }
  | { mode: "expired" };

export function mailApiBase(region: string): string {
  return region === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
}

export function platformMailConfig(): MailConfig | null {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL;
  if (!apiKey || !domain || !fromEmail) return null;
  return { apiKey, domain, fromEmail, apiBase: mailApiBase("us"), own: false };
}

const companyMailSelect = {
  createdAt: true,
  sharedEmailExempt: true,
  mailgunDomain: true,
  mailgunRegion: true,
  mailgunApiKeyEnc: true,
  mailgunSigningKeyEnc: true,
  mailFromEmail: true,
} as const;

type CompanyMail = {
  createdAt: Date;
  sharedEmailExempt: boolean;
  mailgunDomain: string | null;
  mailgunRegion: string;
  mailgunApiKeyEnc: string | null;
  mailgunSigningKeyEnc: string | null;
  mailFromEmail: string | null;
};

export function sharedEmailStatusOf(c: CompanyMail): SharedEmailStatus {
  if (c.mailgunDomain && c.mailgunApiKeyEnc) return { mode: "own", domain: c.mailgunDomain };
  if (c.sharedEmailExempt) return { mode: "exempt" };
  const msLeft = c.createdAt.getTime() + SHARED_EMAIL_DAYS * 24 * 60 * 60 * 1000 - Date.now();
  return msLeft > 0 ? { mode: "shared", daysLeft: Math.ceil(msLeft / (24 * 60 * 60 * 1000)) } : { mode: "expired" };
}

export async function sharedEmailStatus(companyId: string): Promise<SharedEmailStatus> {
  const c = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: companyMailSelect });
  return sharedEmailStatusOf(c);
}

/**
 * The Mailgun setup a company's email goes through: its own account when connected, otherwise the shared platform
 * sender (only while its shared period lasts). With no company (internal notices to staff) it's always the platform.
 * Returns null if nothing is configured; throws SharedEmailExpiredError when the shared period is over.
 */
export async function getMailConfig(companyId?: string): Promise<MailConfig | null> {
  if (!companyId) return platformMailConfig();

  const c = await prisma.company.findUnique({ where: { id: companyId }, select: companyMailSelect });
  if (!c) return platformMailConfig();

  const status = sharedEmailStatusOf(c);
  if (status.mode === "own") {
    const apiKey = decryptSecret(c.mailgunApiKeyEnc);
    if (apiKey) {
      return {
        apiKey,
        domain: c.mailgunDomain!,
        fromEmail: c.mailFromEmail || `noreply@${c.mailgunDomain}`,
        apiBase: mailApiBase(c.mailgunRegion),
        own: true,
      };
    }
    // Stored key can't be read (the encryption secret changed): fall through to the shared rules below.
  }
  if (status.mode === "expired") throw new SharedEmailExpiredError();
  return platformMailConfig();
}

/** Keys that may legitimately sign an inbound webhook for this company's conversations. */
export async function inboundSigningKeys(companyId: string): Promise<string[]> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { mailgunApiKeyEnc: true, mailgunSigningKeyEnc: true },
  });
  const own = [decryptSecret(c?.mailgunSigningKeyEnc), decryptSecret(c?.mailgunApiKeyEnc)];
  const platform = [process.env.MAILGUN_WEBHOOK_SIGNING_KEY, process.env.MAILGUN_API_KEY];
  return [...own, ...platform].filter((k): k is string => !!k);
}
