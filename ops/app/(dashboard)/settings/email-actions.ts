"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { encryptSecret } from "@/lib/secrets";
import { mailApiBase, sharedEmailStatus } from "@/lib/mail-config";
import { sendEmail } from "@/lib/mailgun";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const DOMAIN_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Connects a company's own Mailgun account. The details are checked against Mailgun before anything is saved, and the
 * keys are stored encrypted. From then on the company's email goes out through its own account.
 */
export async function connectOwnMailgun(input: {
  domain: string;
  region: string;
  apiKey: string;
  signingKey: string;
  fromEmail: string;
}): Promise<Result> {
  const { companyId } = await requireSession();

  const domain = input.domain.trim().toLowerCase();
  const apiKey = input.apiKey.trim();
  const signingKey = input.signingKey.trim();
  const fromEmail = input.fromEmail.trim().toLowerCase() || `noreply@${domain}`;
  const region = input.region === "eu" ? "eu" : "us";

  if (!DOMAIN_PATTERN.test(domain)) return { ok: false, error: "Enter your Mailgun sending domain, like mg.yourbusiness.com." };
  if (!apiKey) return { ok: false, error: "Paste your Mailgun private API key." };
  if (!EMAIL_PATTERN.test(fromEmail) || !fromEmail.endsWith(`@${domain}`)) {
    return { ok: false, error: `The From address has to be on your Mailgun domain, like noreply@${domain}.` };
  }

  // Ask Mailgun about the domain with this key: confirms the key works, the region is right, and the domain is active.
  let res: Response;
  try {
    res = await fetch(`${mailApiBase(region)}/v3/domains/${domain}`, {
      headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Mailgun. Try again in a moment." };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "Mailgun rejected that API key. Use the private API key from your Mailgun account." };
  if (res.status === 404) return { ok: false, error: `Mailgun doesn't have a domain called ${domain} in this account and region. Check the name, and the US/EU setting.` };
  if (!res.ok) return { ok: false, error: `Mailgun answered with an error (${res.status}). Try again.` };

  const data = (await res.json().catch(() => null)) as { domain?: { state?: string } } | null;
  if (data?.domain?.state && data.domain.state !== "active") {
    return { ok: false, error: `That domain isn't verified in Mailgun yet (status: ${data.domain.state}). Finish the DNS setup in Mailgun, then try again.` };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      mailgunDomain: domain,
      mailgunRegion: region,
      mailgunApiKeyEnc: encryptSecret(apiKey),
      mailgunSigningKeyEnc: signingKey ? encryptSecret(signingKey) : null,
      mailFromEmail: fromEmail,
    },
  });
  revalidatePath("/settings");
  return { ok: true, message: "Connected. Email now goes out through your Mailgun account." };
}

export async function disconnectOwnMailgun(): Promise<Result> {
  const { companyId } = await requireSession();
  await prisma.company.update({
    where: { id: companyId },
    data: { mailgunDomain: null, mailgunApiKeyEnc: null, mailgunSigningKeyEnc: null, mailFromEmail: null },
  });
  revalidatePath("/settings");
  return { ok: true };
}

/** Sends a test message to the company's own address, through whichever setup is active. */
export async function sendTestEmail(): Promise<Result> {
  const { companyId } = await requireSession();
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, email: true } });
  if (!company.email) return { ok: false, error: "Add your company email at the top of Settings first, so there's somewhere to send the test." };

  try {
    await sendEmail({
      to: company.email,
      fromName: company.name,
      companyId,
      subject: "Test email from your account",
      text: `This is a test message.\n\nIf you're reading it, email is working for ${company.name}.`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "The test email couldn't be sent." };
  }
  const status = await sharedEmailStatus(companyId);
  return { ok: true, message: `Sent to ${company.email}${status.mode === "own" ? " through your Mailgun account" : ""}. Check your inbox.` };
}
