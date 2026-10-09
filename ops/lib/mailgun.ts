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
  attachments,
}: {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
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
  const headers: Record<string, string> = { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}` };

  // Attachments need a multipart body; plain messages keep the simple form-encoded one.
  let body: URLSearchParams | FormData;
  if (attachments && attachments.length > 0) {
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v);
    for (const a of attachments) {
      form.append("attachment", new Blob([new Uint8Array(a.content)], { type: a.contentType }), a.filename);
    }
    body = form; // fetch sets the multipart Content-Type (with boundary) itself
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(params);
  }

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, { method: "POST", headers, body });

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
  // Mailgun signs with the account's HTTP webhook signing key on newer accounts and with the API key on older ones,
  // so accept either. Set MAILGUN_WEBHOOK_SIGNING_KEY to the signing key (Mailgun > Settings > API Security).
  const keys = [process.env.MAILGUN_WEBHOOK_SIGNING_KEY, process.env.MAILGUN_API_KEY].filter((k): k is string => !!k);
  if (keys.length === 0 || !timestamp || !token || !signature) return false;

  // Reject old messages so a captured request can't be replayed later (Mailgun retries for up to a few hours).
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 24 * 60 * 60) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const givenBuf = Buffer.from(signature);
  return keys.some((key) => {
    const expectedBuf = Buffer.from(createHmac("sha256", key).update(timestamp + token).digest("hex"));
    return expectedBuf.length === givenBuf.length && timingSafeEqual(expectedBuf, givenBuf);
  });
}
