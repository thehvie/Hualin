import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { last10, verifyTwilioSignature, twilioInboundUrl, STOP_WORDS, START_WORDS } from "@/lib/twilio";

// Twilio webhook for inbound SMS (set as the "A message comes in" URL on the
// TWILIO_FROM_NUMBER in the Twilio console: POST <NEXTAUTH_URL>/api/twilio/inbound).
//
// One number is shared by all tenants, so a reply is routed by the sender's
// phone number: the customer whose phone matches, preferring the tenant that
// most recently texted that number. Replies attach to the estimate/invoice
// of that most recent outbound text so they show up in the Conversation panel.

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twiml() {
  return new NextResponse(EMPTY_TWIML, { status: 200, headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });

  if (!verifyTwilioSignature(twilioInboundUrl(), params, req.headers.get("x-twilio-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const from = params.From || "";
  const body = (params.Body || "").trim();
  const digits = last10(from);
  if (digits.length !== 10 || !body) return twiml();

  // Narrow in SQL on the last 4 digits, then confirm the full match in JS
  // (stored phones are free-form: "(555) 123-4567", "555-123-4567", ...).
  const candidates = await prisma.customer.findMany({
    where: { phone: { contains: digits.slice(-4) } },
    select: { id: true, companyId: true, phone: true },
  });
  const matches = candidates.filter((c) => last10(c.phone) === digits);
  if (matches.length === 0) return twiml();

  const recentOutbound = await prisma.communication.findFirst({
    where: { channel: "SMS", direction: "OUTBOUND", customerId: { in: matches.map((m) => m.id) } },
    orderBy: { createdAt: "desc" },
  });
  const customer = matches.find((m) => m.id === recentOutbound?.customerId) ?? matches[0];

  const upper = body.toUpperCase();
  if (STOP_WORDS.includes(upper)) {
    await prisma.customer.update({ where: { id: customer.id }, data: { smsOptedOut: true } });
  } else if (START_WORDS.includes(upper)) {
    await prisma.customer.update({ where: { id: customer.id }, data: { smsOptedOut: false } });
  }

  await prisma.communication.create({
    data: {
      companyId: customer.companyId,
      customerId: customer.id,
      estimateId: recentOutbound?.customerId === customer.id ? recentOutbound.estimateId : undefined,
      invoiceId: recentOutbound?.customerId === customer.id ? recentOutbound.invoiceId : undefined,
      channel: "SMS",
      direction: "INBOUND",
      body,
      providerId: params.MessageSid || null,
    },
  });

  return twiml();
}
