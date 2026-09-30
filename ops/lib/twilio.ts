import { createHmac, timingSafeEqual } from "crypto";

/**
 * Thin wrapper around Twilio's REST API (no SDK). One shared account/number for
 * all tenants for now, same approach as Mailgun — the tenant's Company name
 * is put in the message body so texts still read as coming from "their" business.
 */

export class TwilioNotConfiguredError extends Error {
  constructor() {
    super("Twilio is not configured (TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER, and TWILIO_AUTH_TOKEN or TWILIO_API_KEY_SID/SECRET).");
    this.name = "TwilioNotConfiguredError";
  }
}

/** True when the env has everything sendSms needs. */
export function twilioConfigured(): boolean {
  const hasKey = !!(process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET);
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_FROM_NUMBER && (hasKey || process.env.TWILIO_AUTH_TOKEN));
}

/** Normalizes a US phone number to E.164 (+1XXXXXXXXXX). Returns null if it can't. */
export function toE164(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Last 10 digits, for matching an inbound number against stored customer phones. */
export function last10(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "").slice(-10);
}

export async function sendSms({ to, body }: { to: string; body: string }): Promise<{ sid: string | null }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  // Either an API Key (SK... + secret) or the account Auth Token can authenticate
  // requests; the URL always uses the Account SID (AC...).
  const authUser = process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET ? process.env.TWILIO_API_KEY_SID : sid;
  const authPass =
    process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET ? process.env.TWILIO_API_KEY_SECRET : process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !authUser || !authPass || !from) throw new TwilioNotConfiguredError();

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio send failed (${res.status}): ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { sid?: string };
  return { sid: json.sid ?? null };
}

/** Public URL Twilio is configured to POST inbound messages to. */
export function twilioInboundUrl(): string {
  const origin = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${origin}/api/twilio/inbound`;
}

/**
 * Verifies Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + each
 * POST param name+value, sorted by name)).
 */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const STOP_WORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
export const START_WORDS = ["START", "YES", "UNSTOP"];
