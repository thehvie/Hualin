/**
 * Thin wrapper around Mailgun's HTTP API. Shared across tenants for now — one
 * verified sending domain/from-address for the whole app, with the tenant's
 * Company name used as the display name so mail still reads as coming from
 * "their" business rather than a generic sender.
 */

export class MailgunNotConfiguredError extends Error {
  constructor() {
    super("Mailgun is not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN / MAILGUN_FROM_EMAIL).");
    this.name = "MailgunNotConfiguredError";
  }
}

export async function sendEmail({
  to,
  subject,
  text,
  fromName,
  replyTo,
}: {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  replyTo?: string;
}): Promise<{ messageId: string | null }> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL;

  if (!apiKey || !domain || !fromEmail) {
    throw new MailgunNotConfiguredError();
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const params: Record<string, string> = { from, to, subject, text };
  if (replyTo) params["h:Reply-To"] = replyTo;
  const body = new URLSearchParams(params);

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Mailgun send failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return { messageId: data?.id ?? null };
}

/**
 * Builds a thread-specific reply address on the Mailgun sending domain, e.g.
 * "invoice-<id>@mg.example.com". A customer's mail client replies to this
 * address (not the visible From address), which Mailgun forwards to
 * /api/mailgun/inbound so the reply lands on the right thread automatically.
 */
export function threadReplyAddress(kind: "invoice" | "estimate", id: string): string | null {
  const domain = process.env.MAILGUN_DOMAIN;
  if (!domain) return null;
  return `${kind}-${id}@${domain}`;
}

/**
 * Verifies Mailgun's inbound-route webhook signature: HMAC-SHA256 of
 * `timestamp + token` keyed with the Mailgun API key, per Mailgun's
 * (legacy but still current) webhook signing scheme.
 */
export async function verifyInboundSignature(
  timestamp: string,
  token: string,
  signature: string,
): Promise<boolean> {
  const apiKey = process.env.MAILGUN_API_KEY;
  if (!apiKey) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", apiKey).update(timestamp + token).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  return expectedBuf.length === givenBuf.length && timingSafeEqual(expectedBuf, givenBuf);
}
