"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendSms, toE164, TwilioNotConfiguredError } from "@/lib/twilio";
import { messageChannel } from "@/lib/messaging";
import { sendEmail, threadReplyAddress, MailgunNotConfiguredError } from "@/lib/mailgun";
import { newPublicToken, estimateSigningUrl } from "@/lib/estimate-signing";
import { formatCents, lineItemsTotal } from "@/lib/money";
import { MAX_ATTACHMENTS, attachmentStorage, normalizeAttachment, saveAttachments, type StoredFile } from "@/lib/comm-attachments";

type Result = { ok: true } | { ok: false; error: string };

const MAX_BODY = 600;

async function deliver(opts: {
  companyId: string;
  customerId: string;
  body: string;
  estimateId?: string;
  invoiceId?: string;
}): Promise<Result> {
  const customer = await prisma.customer.findFirst({ where: { id: opts.customerId, companyId: opts.companyId } });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (customer.smsOptedOut) {
    return { ok: false, error: "This customer replied STOP and has opted out of texts." };
  }
  const to = toE164(customer.phone);
  if (!to) return { ok: false, error: "This customer has no valid US mobile number on file." };

  let sid: string | null = null;
  try {
    ({ sid } = await sendSms({ to, body: opts.body }));
  } catch (err) {
    if (err instanceof TwilioNotConfiguredError) return { ok: false, error: "Texting isn't set up yet (Twilio isn't configured)." };
    console.error("[sms] send failed", err);
    return { ok: false, error: "The text couldn't be sent. Check the phone number and try again." };
  }

  await prisma.communication.create({
    data: {
      companyId: opts.companyId,
      customerId: customer.id,
      estimateId: opts.estimateId,
      invoiceId: opts.invoiceId,
      channel: "SMS",
      direction: "OUTBOUND",
      body: opts.body,
      providerId: sid,
    },
  });
  return { ok: true };
}

/** Emails a free-form message from the Conversation panel (used when texting is not available). */
async function deliverEmail(opts: {
  companyId: string;
  customerId: string;
  body: string;
  estimateId?: string;
  invoiceId?: string;
  files?: StoredFile[];
}): Promise<Result> {
  const customer = await prisma.customer.findFirst({
    where: { id: opts.customerId, companyId: opts.companyId },
    include: { company: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (!customer.email) return { ok: false, error: "This customer has no email address on file." };

  let subject = `A message from ${customer.company.name}`;
  let replyTo: string | undefined;
  if (opts.estimateId) {
    const est = await prisma.estimate.findFirst({ where: { id: opts.estimateId, companyId: opts.companyId } });
    if (est) subject = `Estimate #${est.number} from ${customer.company.name}`;
    replyTo = threadReplyAddress("estimate", opts.estimateId) ?? undefined;
  } else if (opts.invoiceId) {
    const inv = await prisma.invoice.findFirst({ where: { id: opts.invoiceId, companyId: opts.companyId } });
    if (inv) subject = `Invoice #${inv.number} from ${customer.company.name}`;
    replyTo = threadReplyAddress("invoice", opts.invoiceId) ?? undefined;
  }

  let messageId: string | null = null;
  try {
    ({ messageId } = await sendEmail({
      to: customer.email,
      fromName: customer.company.name,
      replyTo,
      subject,
      text: opts.body,
      attachments: opts.files?.map((f) => ({ filename: f.filename, content: f.data, contentType: f.mimeType })),
    }));
  } catch (err) {
    if (err instanceof MailgunNotConfiguredError) {
      return { ok: false, error: "Email isn't set up yet (Mailgun isn't configured)." };
    }
    console.error("[email] send failed", err);
    return { ok: false, error: "The email couldn't be sent. Please try again." };
  }

  const sent = await prisma.communication.create({
    data: {
      companyId: opts.companyId,
      customerId: customer.id,
      estimateId: opts.estimateId,
      invoiceId: opts.invoiceId,
      channel: "EMAIL",
      direction: "OUTBOUND",
      body: opts.body,
      providerId: messageId,
    },
  });
  await saveAttachments(opts.companyId, sent.id, opts.files ?? []);
  return { ok: true };
}

/**
 * Free-form message from the Conversation panel on an estimate or invoice.
 * Texts the customer when Twilio is set up and they can be texted; otherwise
 * emails them instead.
 */
export async function sendCustomerSms(
  input: {
    customerId: string;
    body: string;
    estimateId?: string;
    invoiceId?: string;
    /** Which tab the message was written in. Left out, it texts when possible and otherwise emails. */
    channel?: "sms" | "email";
  },
  attachmentData?: FormData,
): Promise<Result> {
  const { companyId } = await requireSession();

  // Photos and documents can only go by email (texting can't carry them).
  const rawFiles = (attachmentData?.getAll("files") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (rawFiles.length > MAX_ATTACHMENTS) return { ok: false, error: `Attach at most ${MAX_ATTACHMENTS} files.` };
  let files: StoredFile[];
  try {
    files = await Promise.all(rawFiles.map(async (f) => normalizeAttachment(f.name, f.type, Buffer.from(await f.arrayBuffer()))));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't read the attachments." };
  }

  if (files.length > 0) {
    const { remainingBytes } = await attachmentStorage(companyId);
    if (files.reduce((sum, f) => sum + f.data.byteLength, 0) > remainingBytes) {
      return { ok: false, error: "Your email attachment storage is full. Remove older attachments or contact support." };
    }
  }

  const body = input.body.trim() || (files.length > 0 ? "Please see the attached." : "");
  if (!body) return { ok: false, error: "Type a message first." };
  if (body.length > MAX_BODY) return { ok: false, error: `Messages are limited to ${MAX_BODY} characters.` };

  // Scope the thread link to this tenant so a forged id can't attach elsewhere.
  if (input.estimateId && !(await prisma.estimate.findFirst({ where: { id: input.estimateId, companyId } }))) {
    return { ok: false, error: "Estimate not found." };
  }
  if (input.invoiceId && !(await prisma.invoice.findFirst({ where: { id: input.invoiceId, companyId } }))) {
    return { ok: false, error: "Invoice not found." };
  }

  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, companyId } });
  if (!customer) return { ok: false, error: "Customer not found." };

  if (files.length > 0 && !customer.email) {
    return { ok: false, error: "Attachments are sent by email, and this customer has no email address on file." };
  }
  const available = messageChannel(customer);
  if (input.channel === "email" && !customer.email) return { ok: false, error: "This customer has no email address on file." };
  if (input.channel === "sms" && available !== "sms") {
    return { ok: false, error: "Texting isn't available for this customer (no phone number, or texting isn't set up yet)." };
  }
  const channel = input.channel ?? (files.length > 0 ? "email" : available);
  if (!channel) return { ok: false, error: "This customer has no phone number or email address on file." };

  const args = { companyId, customerId: input.customerId, body, estimateId: input.estimateId, invoiceId: input.invoiceId, files };
  const res = channel === "sms" ? await deliver(args) : await deliverEmail(args);
  if (res.ok) {
    if (input.estimateId) revalidatePath(`/estimates/${input.estimateId}`);
    if (input.invoiceId) revalidatePath(`/invoices/${input.invoiceId}`);
  }
  return res;
}

/** Texts the customer their private sign-and-approve link. */
export async function sendEstimateSms(estimateId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: { customer: true, company: true, lineItems: true },
  });
  if (!estimate) return { ok: false, error: "Estimate not found." };
  if (estimate.lineItems.length === 0) return { ok: false, error: "Add at least one item before sending this estimate." };

  const publicToken = estimate.publicToken ?? newPublicToken();
  if (!estimate.publicToken) {
    await prisma.estimate.update({ where: { id: estimateId }, data: { publicToken } });
  }

  const total = Math.max(0, lineItemsTotal(estimate.lineItems) - estimate.discountCents) + estimate.fuelSurchargeCents;
  const body = `Hi ${estimate.customer.firstName}, your estimate #${estimate.number} from ${estimate.company.name} is ready (${formatCents(total)}). Review and sign here: ${estimateSigningUrl(publicToken)}`;

  const res = await deliver({ companyId, customerId: estimate.customerId, body, estimateId });
  if (res.ok) {
    if (estimate.status === "DRAFT") {
      await prisma.estimate.update({ where: { id: estimateId }, data: { status: "SENT", sentAt: new Date() } });
    }
    revalidatePath(`/estimates/${estimateId}`);
  }
  return res;
}
