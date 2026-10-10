import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sendEmail, verifyInboundSignature } from "@/lib/mailgun";
import { inboundSigningKeys } from "@/lib/mail-config";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_ATTACHMENTS, attachmentStorage, normalizeAttachment, saveAttachments } from "@/lib/comm-attachments";

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

  const recipient = String(form.get("recipient") || "");
  const sender = String(form.get("sender") || "");
  const subject = String(form.get("subject") || "");
  let body = String(form.get("stripped-text") || form.get("body-plain") || "").trim();
  const messageId = String(form.get("Message-Id") || "") || null;

  // Files and photos the customer attached. Mailgun sends them as attachment-1, attachment-2, ...
  const rawFiles: File[] = [];
  const count = Math.min(parseInt(String(form.get("attachment-count") || "0"), 10) || 0, 25);
  for (let n = 1; n <= count; n++) {
    const f = form.get(`attachment-${n}`);
    if (f instanceof File && f.size > 0) rawFiles.push(f);
  }

  const match = recipient.match(RECIPIENT_PATTERN);
  if (!match || (!body && rawFiles.length === 0)) {
    // Not a thread we recognize (or an empty/auto-generated message) —
    // acknowledge so Mailgun doesn't retry, but do nothing with it.
    return NextResponse.json({ received: true, matched: false });
  }

  const [, kind, id] = match;

  const thread =
    kind === "invoice"
      ? await prisma.invoice.findUnique({ where: { id }, select: { id: true, number: true, companyId: true, customerId: true } })
      : await prisma.estimate.findUnique({ where: { id }, select: { id: true, number: true, companyId: true, customerId: true } });

  // Verify the signature with the keys that can legitimately sign for this conversation's company (its own Mailgun
  // account, then the platform's). Nothing is written before this passes.
  const keys = thread
    ? await inboundSigningKeys(thread.companyId)
    : [process.env.MAILGUN_WEBHOOK_SIGNING_KEY, process.env.MAILGUN_API_KEY].filter((k): k is string => !!k);
  if (!(await verifyInboundSignature(timestamp, token, signature, keys))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!thread) {
    return NextResponse.json({ received: true, matched: false });
  }

  // Cap what any one conversation (and any one company) can take in per hour, so spam aimed at a thread address
  // can't fill the inbox or the attachment storage. Acknowledged with 200 so Mailgun doesn't retry it.
  if (!rateLimit(`inbound-thread:${thread.id}`, 30, 60 * 60 * 1000).ok || !rateLimit(`inbound-company:${thread.companyId}`, 200, 60 * 60 * 1000).ok) {
    return NextResponse.json({ received: true, matched: false, limited: true });
  }

  // Is this really the customer? Anyone who learns a thread address can email it, so a message from an address
  // other than the one on file is saved but held: its attachments stay hidden until staff confirm the sender.
  const fromHeader = String(form.get("from") || sender);
  const fromEmail = (fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader).trim().toLowerCase();
  const customerOnFile = await prisma.customer.findUnique({
    where: { id: thread.customerId },
    select: { firstName: true, lastName: true, email: true },
  });
  const senderVerified = !!customerOnFile?.email && customerOnFile.email.trim().toLowerCase() === fromEmail;

  // Keep what we can accept; say so in the message if something was left out.
  let room = (await attachmentStorage(thread.companyId)).remainingBytes;
  const files: { filename: string; mimeType: string; data: Buffer }[] = [];
  const skipped: string[] = [];
  for (const f of rawFiles) {
    if (files.length >= MAX_ATTACHMENTS) {
      skipped.push(f.name);
      continue;
    }
    try {
      const stored = await normalizeAttachment(f.name, f.type, Buffer.from(await f.arrayBuffer()));
      if (stored.data.byteLength > room) {
        skipped.push(f.name);
        continue;
      }
      room -= stored.data.byteLength;
      files.push(stored);
    } catch {
      skipped.push(f.name);
    }
  }
  if (!body) body = "(sent an attachment)";
  if (skipped.length > 0) body += `\n\n[Not saved (too large or an unsupported type): ${skipped.join(", ")}]`;

  const communication = await prisma.communication.create({
    data: {
      companyId: thread.companyId,
      customerId: thread.customerId,
      invoiceId: kind === "invoice" ? thread.id : undefined,
      estimateId: kind === "estimate" ? thread.id : undefined,
      channel: "EMAIL",
      direction: "INBOUND",
      body: `From: ${fromHeader || sender}\n\n${body}`,
      providerId: messageId,
      senderVerified,
    },
  });
  await saveAttachments(thread.companyId, communication.id, files);

  // Let the company know a customer replied, so it isn't missed until someone opens the estimate.
  try {
    const company = await prisma.company.findUnique({ where: { id: thread.companyId }, select: { name: true, email: true } });
    const customer = customerOnFile;
    if (company?.email && customer) {
      const origin = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
      const link = `${origin}/${kind === "invoice" ? "invoices" : "estimates"}/${thread.id}`;
      const name = `${customer.firstName} ${customer.lastName}`;
      await sendEmail({
        to: company.email,
        fromName: company.name,
        subject: `New reply from ${name} on ${kind === "invoice" ? "invoice" : "estimate"} #${thread.number}${senderVerified ? "" : " (unverified sender)"}`,
        text: [
          `${name} replied${subject ? ` (${subject})` : ""}:`,
          "",
          senderVerified ? "" : `This came from ${fromEmail}, which isn't the email on file for ${name}. Check it before trusting it.`,
          body.slice(0, 500),
          files.length > 0 ? `\n${files.length} attachment${files.length === 1 ? "" : "s"} saved.` : "",
          "",
          `Open the conversation: ${link}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    // A failed alert must not make Mailgun retry (and duplicate) the message.
    console.error("[mailgun inbound] notification failed", err);
  }

  return NextResponse.json({ received: true, matched: true, id: communication.id });
}
