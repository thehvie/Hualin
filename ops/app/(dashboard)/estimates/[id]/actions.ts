"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { lineItemsTotal, formatCents } from "@/lib/money";
import { sendEmail, threadReplyAddress, MailgunNotConfiguredError } from "@/lib/mailgun";
import { requireSession } from "@/lib/session";
import { createInvoiceFromEstimate } from "@/lib/estimate-invoice";
import { newPublicToken, estimateSigningUrl } from "@/lib/estimate-signing";
import { fromDatetimeLocalInTz, rentalDays } from "@/lib/tz";

function toCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

async function assertEstimateOwnership(estimateId: string, companyId: string) {
  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId } });
  if (!estimate) throw new Error("Estimate not found");
  return estimate;
}

export async function addLineItem(estimateId: string, formData: FormData) {
  const { companyId } = await requireSession();
  await assertEstimateOwnership(estimateId, companyId);

  const description = String(formData.get("description") || "").trim();
  const quantity = parseInt(String(formData.get("quantity") || "1"), 10) || 1;
  const unitPriceCents = toCents(String(formData.get("unitPrice") || "0"));
  const costCents = formData.get("cost") ? toCents(String(formData.get("cost"))) : null;
  const saveToPriceBook = formData.get("saveToPriceBook") === "on";
  const isRental = formData.get("isRental") === "on";

  if (!description) return;

  let priceBookItemId: string | null = null;
  if (saveToPriceBook) {
    const priceBookItem = await prisma.priceBookItem.create({
      data: { companyId, name: description, unitPriceCents, costCents, type: isRental ? "RENTAL" : "SERVICE" },
    });
    priceBookItemId = priceBookItem.id;
  }

  const count = await prisma.estimateLineItem.count({ where: { estimateId, companyId } });
  await prisma.estimateLineItem.create({
    data: {
      companyId,
      estimateId,
      description,
      quantity,
      unitPriceCents,
      costCents,
      isRental,
      priceBookItemId,
      sortOrder: count,
    },
  });
  revalidatePath(`/estimates/${estimateId}`);
  if (saveToPriceBook) revalidatePath("/price-book");
}

export async function addLineItemFromPriceBook(estimateId: string, priceBookItemId: string) {
  const { companyId } = await requireSession();
  await assertEstimateOwnership(estimateId, companyId);

  const item = await prisma.priceBookItem.findFirst({ where: { id: priceBookItemId, companyId } });
  if (!item) return;

  const count = await prisma.estimateLineItem.count({ where: { estimateId, companyId } });
  await prisma.estimateLineItem.create({
    data: {
      companyId,
      estimateId,
      priceBookItemId: item.id,
      description: item.name,
      quantity: 1,
      unitPriceCents: item.unitPriceCents,
      costCents: item.costCents,
      isRental: item.type === "RENTAL",
      sortOrder: count,
    },
  });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function addLineItemsFromPriceBook(estimateId: string, picks: { priceBookItemId: string; quantity: number }[]) {
  const { companyId } = await requireSession();
  await assertEstimateOwnership(estimateId, companyId);
  if (picks.length === 0) return;

  const items = await prisma.priceBookItem.findMany({
    where: { id: { in: picks.map((p) => p.priceBookItemId) }, companyId, active: true },
  });
  const byId = new Map(items.map((i) => [i.id, i]));
  let sortOrder = await prisma.estimateLineItem.count({ where: { estimateId, companyId } });

  const data = picks.flatMap((p) => {
    const item = byId.get(p.priceBookItemId);
    if (!item) return [];
    return [
      {
        companyId,
        estimateId,
        priceBookItemId: item.id,
        description: item.name,
        quantity: Math.max(1, Math.min(9999, Math.floor(Number(p.quantity)) || 1)),
        unitPriceCents: item.unitPriceCents,
        costCents: item.costCents,
        isRental: item.type === "RENTAL",
        sortOrder: sortOrder++,
      },
    ];
  });
  if (data.length > 0) await prisma.estimateLineItem.createMany({ data });
  revalidatePath(`/estimates/${estimateId}`);
}

/**
 * Sets (or clears) when the job is scheduled. Values are "YYYY-MM-DDTHH:mm" in the company's timezone.
 * `end` is only for rentals: with both dates set, every rental line's quantity becomes the number of days.
 */
export async function updateEstimateSchedule(
  estimateId: string,
  start: string,
  end: string = "",
): Promise<{ error: string } | { days: number | null }> {
  const { companyId } = await requireSession();
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { jobId: true, job: { select: { status: true } } },
  });
  if (!estimate?.jobId || !estimate.job) return { error: "This estimate has no job to schedule." };

  const { timezone } = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const scheduledAt = start ? fromDatetimeLocalInTz(start, timezone) : null;
  if (start && !scheduledAt) return { error: "That date and time isn't valid." };
  const scheduledEndAt = scheduledAt && end ? fromDatetimeLocalInTz(end, timezone) : null;
  if (scheduledAt && end && !scheduledEndAt) return { error: "That end date isn't valid." };
  if (scheduledAt && scheduledEndAt && scheduledEndAt < scheduledAt) return { error: "The rental can't end before it starts." };

  // Setting a date schedules an unscheduled job; clearing it unschedules a scheduled one.
  const status = scheduledAt
    ? estimate.job.status === "UNSCHEDULED" ? "SCHEDULED" : undefined
    : estimate.job.status === "SCHEDULED" ? "UNSCHEDULED" : undefined;
  await prisma.job.updateMany({ where: { id: estimate.jobId, companyId }, data: { scheduledAt, scheduledEndAt, status } });

  let days: number | null = null;
  if (scheduledAt && scheduledEndAt) {
    days = rentalDays(scheduledAt, scheduledEndAt, timezone);
    await prisma.estimateLineItem.updateMany({ where: { estimateId, companyId, isRental: true }, data: { quantity: days } });
  }

  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath(`/jobs/${estimate.jobId}`);
  revalidatePath("/schedule");
  return { days };
}

export async function updateLineItemQuantity(estimateId: string, lineItemId: string, quantity: number) {
  const { companyId } = await requireSession();
  const qty = Math.max(1, Math.min(9999, Math.floor(quantity) || 1));
  await prisma.estimateLineItem.updateMany({ where: { id: lineItemId, estimateId, companyId }, data: { quantity: qty } });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function removeLineItem(estimateId: string, lineItemId: string) {
  const { companyId } = await requireSession();
  await prisma.estimateLineItem.deleteMany({ where: { id: lineItemId, estimateId, companyId } });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function updateEstimateHeader(estimateId: string, formData: FormData) {
  const { companyId } = await requireSession();

  const status = String(formData.get("status") || "DRAFT");
  const notes = String(formData.get("notes") || "").trim();
  const discountCents = toCents(String(formData.get("discount") || "0"));
  const depositCents = toCents(String(formData.get("deposit") || "0"));
  const laborCostCents = toCents(String(formData.get("laborCost") || "0"));

  const updated = await prisma.estimate.updateMany({
    where: { id: estimateId, companyId },
    data: {
      status: status as "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "EXPIRED",
      notes: notes || null,
      discountCents,
      depositCents,
      laborCostCents,
    },
  });
  // "Job details" on the estimate is the same text as the job's notes, so keep them in step.
  if (updated.count > 0) {
    const est = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, select: { jobId: true } });
    if (est?.jobId) await prisma.job.updateMany({ where: { id: est.jobId, companyId }, data: { notes: notes || null } });
  }
  revalidatePath(`/estimates/${estimateId}`);
}

export async function addPaymentScheduleItem(estimateId: string, formData: FormData) {
  const { companyId } = await requireSession();
  await assertEstimateOwnership(estimateId, companyId);

  const label = String(formData.get("label") || "").trim();
  const amountCents = toCents(String(formData.get("amount") || "0"));
  const dueDateStr = String(formData.get("dueDate") || "");

  if (!label) return;

  const count = await prisma.estimatePaymentScheduleItem.count({ where: { estimateId, companyId } });
  await prisma.estimatePaymentScheduleItem.create({
    data: {
      companyId,
      estimateId,
      label,
      amountCents,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      sortOrder: count,
    },
  });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function removePaymentScheduleItem(estimateId: string, itemId: string) {
  const { companyId } = await requireSession();
  await prisma.estimatePaymentScheduleItem.deleteMany({
    where: { id: itemId, estimateId, companyId },
  });
  revalidatePath(`/estimates/${estimateId}`);
}

/** Creates the invoice once the job is complete (see createInvoiceFromEstimate). */
export async function createInvoiceForEstimate(estimateId: string): Promise<{ error: string } | void> {
  const { companyId } = await requireSession();
  const result = await createInvoiceFromEstimate(estimateId, companyId);
  if ("error" in result) return result;
  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/invoices/${result.invoiceId}`);
}

export async function sendEstimate(
  estimateId: string,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const { companyId } = await requireSession();

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: { customer: true, lineItems: true, company: true },
  });
  if (!estimate) return { ok: false, skipped: false, error: "Estimate not found." };
  if (!estimate.customer.email) {
    return { ok: false, skipped: false, error: "This customer has no email address on file." };
  }

  if (estimate.lineItems.length === 0) {
    return { ok: false, skipped: false, error: "Add at least one item before sending this estimate." };
  }

  const publicToken = estimate.publicToken ?? newPublicToken();
  if (!estimate.publicToken) {
    await prisma.estimate.update({ where: { id: estimateId }, data: { publicToken } });
  }

  const totalCents = Math.max(0, lineItemsTotal(estimate.lineItems) - estimate.discountCents);
  const emailBody = [
    `Hi ${estimate.customer.firstName},`,
    "",
    `Your estimate #${estimate.number} from ${estimate.company.name} is ready for review.`,
    "",
    `Total: ${formatCents(totalCents)}`,
    "",
    "Review the details and sign to approve it here:",
    estimateSigningUrl(publicToken),
    "",
    "Download a PDF copy:",
    `${estimateSigningUrl(publicToken)}/pdf`,
  ].join("\n");

  let skipped = false;
  try {
    const { messageId } = await sendEmail({
      to: estimate.customer.email,
      fromName: estimate.company.name,
      replyTo: threadReplyAddress("estimate", estimate.id) ?? undefined,
      subject: `Estimate #${estimate.number} from ${estimate.company.name}`,
      text: emailBody,
    });
    await prisma.communication.create({
      data: {
        companyId,
        customerId: estimate.customerId,
        estimateId: estimate.id,
        channel: "EMAIL",
        direction: "OUTBOUND",
        body: emailBody,
        providerId: messageId,
      },
    });
  } catch (err) {
    if (err instanceof MailgunNotConfiguredError) {
      skipped = true;
    } else {
      return { ok: false, skipped: false, error: "Could not send the email. Please try again." };
    }
  }

  // Don't knock an already-approved/declined estimate back to SENT on a re-send.
  await prisma.estimate.update({
    where: { id: estimateId },
    data:
      estimate.status === "DRAFT" || estimate.status === "SENT"
        ? { status: "SENT", sentAt: new Date() }
        : { sentAt: new Date() },
  });
  revalidatePath(`/estimates/${estimateId}`);
  return { ok: true, skipped };
}

export async function deleteEstimate(estimateId: string) {
  const { companyId } = await requireSession();
  await prisma.estimate.deleteMany({ where: { id: estimateId, companyId } });
  redirect("/estimates");
}
