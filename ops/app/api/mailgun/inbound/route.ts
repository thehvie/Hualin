import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyInboundSignature } from "@/lib/mailgun";

// Mailgun Route webhook for inbound replies. A customer's reply lands on
// invoice-<id>@<MAILGUN_DOMAIN> or estimate-<id>@<MAILGUN_DOMAIN> (set as the
// Reply-To on the outbound send — see lib/mailgun.ts threadReplyAddress),
// which a Mailgun Route forwards here as a signed multipart POST.
//
// Setup (Mailgun dashboard, one-time): add an MX record for MAILGUN_DOMAIN
// pointing at mxa.mailgun.org / mxb.mailgun.org, then create a Route matching
// recipient regex `^(invoice|estimate)-.+@<MAILGUN_DOMAIN>$` with a
// "forward" action to this endpoint's full URL.

const RECIPIENT_PATTERN = /^(invoice|estimate)-([a-zA-Z0-9]+)@/;

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const timestamp = String(form.get("timestamp") || "");
  const token = String(form.get("token") || "");
  const signature = String(form.get("signature") || "");

  const valid = await verifyInboundSignature(timestamp, token, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const recipient = String(form.get("recipient") || "");
  const sender = String(form.get("sender") || "");
  const body = String(form.get("stripped-text") || form.get("body-plain") || "").trim();
  const messageId = String(form.get("Message-Id") || "") || null;

  const match = recipient.match(RECIPIENT_PATTERN);
  if (!match || !body) {
    // Not a thread we recognize (or an empty/auto-generated message) —
    // acknowledge so Mailgun doesn't retry, but do nothing with it.
    return NextResponse.json({ received: true, matched: false });
  }

  const [, kind, id] = match;

  const thread =
    kind === "invoice"
      ? await prisma.invoice.findUnique({ where: { id }, select: { id: true, companyId: true, customerId: true } })
      : await prisma.estimate.findUnique({ where: { id }, select: { id: true, companyId: true, customerId: true } });

  if (!thread) {
    return NextResponse.json({ received: true, matched: false });
  }

  await prisma.communication.create({
    data: {
      companyId: thread.companyId,
      customerId: thread.customerId,
      invoiceId: kind === "invoice" ? thread.id : undefined,
      estimateId: kind === "estimate" ? thread.id : undefined,
      channel: "EMAIL",
      direction: "INBOUND",
      body: `From: ${sender}\n\n${body}`,
      providerId: messageId,
    },
  });

  return NextResponse.json({ received: true, matched: true });
}
