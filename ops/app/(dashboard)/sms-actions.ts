"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { sendSms, toE164, TwilioNotConfiguredError } from "@/lib/twilio";
import { newPublicToken, estimateSigningUrl } from "@/lib/estimate-signing";
import { formatCents, lineItemsTotal } from "@/lib/money";

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

/** Free-form text from the Conversation panel on an estimate or invoice. */
export async function sendCustomerSms(input: {
  customerId: string;
  body: string;
  estimateId?: string;
  invoiceId?: string;
}): Promise<Result> {
  const { companyId } = await requireSession();
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Type a message first." };
  if (body.length > MAX_BODY) return { ok: false, error: `Messages are limited to ${MAX_BODY} characters.` };

  // Scope the thread link to this tenant so a forged id can't attach elsewhere.
  if (input.estimateId && !(await prisma.estimate.findFirst({ where: { id: input.estimateId, companyId } }))) {
    return { ok: false, error: "Estimate not found." };
  }
  if (input.invoiceId && !(await prisma.invoice.findFirst({ where: { id: input.invoiceId, companyId } }))) {
    return { ok: false, error: "Invoice not found." };
  }

  const res = await deliver({ companyId, customerId: input.customerId, body, estimateId: input.estimateId, invoiceId: input.invoiceId });
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

  const total = Math.max(0, lineItemsTotal(estimate.lineItems) - estimate.discountCents);
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
