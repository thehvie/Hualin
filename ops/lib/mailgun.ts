/**
 * Thin wrapper around Mailgun's HTTP API. A company's mail goes through its own Mailgun account once it has connected
 * one (Settings → Email); until then it uses the shared platform sender, for a limited time (see lib/mail-config.ts).
 * The company's name is the display name either way, so mail reads as coming from "their" business.
 */
import { getMailConfig } from "@/lib/mail-config";

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
  replyThread,
  companyId,
  attachments,
}: {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  replyTo?: string;
  /** Route the customer's reply back to this estimate/invoice (the address is built on the sending domain used). */
  replyThread?: { kind: "invoice" | "estimate"; id: string };
  /** The company sending this mail. Leave out for internal notices to staff, which always use the platform sender. */
  companyId?: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}): Promise<{ messageId: string | null }> {
  const config = await getMailConfig(companyId);
  if (!config) throw new MailgunNotConfiguredError();

  const from = fromName ? `${fromName} <${config.fromEmail}>` : config.fromEmail;
  const params: Record<string, string> = { from, to, subject, text };
  const reply = replyThread ? `${replyThread.kind}-${replyThread.id}@${config.domain}` : replyTo;
  if (reply) params["h:Reply-To"] = reply;
  const headers: Record<string, string> = { Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}` };

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

  const res = await fetch(`${config.apiBase}/v3/${config.domain}/messages`, { method: "POST", headers, body });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`Mailgun send failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return { messageId: data?.id ?? null };
}

/**
 * Verifies Mailgun's inbound-route webhook signature: HMAC-SHA256 of `timestamp + token`. Mailgun signs with the
 * account's HTTP webhook signing key on newer accounts and with the API key on older ones, so the caller passes every
 * key that may be valid for the conversation (the company's own Mailgun keys, then the platform's).
 */
export async function verifyInboundSignature(
  timestamp: string,
  token: string,
  signature: string,
  keys: string[],
): Promise<boolean> {
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
