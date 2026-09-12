"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { lineItemsTotal, formatCents } from "@/lib/money";
import { sendEmail, threadReplyAddress, MailgunNotConfiguredError } from "@/lib/mailgun";
import { requireSession } from "@/lib/session";

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

  if (!description) return;

  let priceBookItemId: string | null = null;
  if (saveToPriceBook) {
    const priceBookItem = await prisma.priceBookItem.create({
      data: { companyId, name: description, unitPriceCents, costCents },
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
      sortOrder: count,
    },
  });
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

  await prisma.estimate.updateMany({
    where: { id: estimateId, companyId },
    data: {
      status: status as "DRAFT" | "SENT" | "APPROVED" | "DECLINED" | "EXPIRED",
      notes: notes || null,
      discountCents,
      depositCents,
      laborCostCents,
    },
  });
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

/**
 * The core workflow: approve the estimate and one-click convert it to an Invoice,
 * copying the line items over.
 */
export async function markAsWon(estimateId: string) {
  const { companyId } = await requireSession();

  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: { lineItems: true, paymentSchedule: { orderBy: { sortOrder: "asc" } }, invoice: true },
  });
  if (!estimate) return;
  if (estimate.invoice) {
    redirect(`/invoices/${estimate.invoice.id}`);
  }

  const [, invoice] = await prisma.$transaction([
    prisma.estimate.update({ where: { id: estimateId }, data: { status: "APPROVED", respondedAt: new Date() } }),
    prisma.invoice.create({
      data: {
        companyId,
        customerId: estimate.customerId,
        estimateId: estimate.id,
        status: "DRAFT",
        name: `Invoice for Estimate #${estimate.number}`,
        notes: estimate.notes,
        discountCents: estimate.discountCents,
        depositCents: estimate.depositCents,
        laborCostCents: estimate.laborCostCents,
        lineItems: {
          create: estimate.lineItems.map((li, i) => ({
            companyId,
            priceBookItemId: li.priceBookItemId,
            description: li.description,
            quantity: li.quantity,
            unitPriceCents: li.unitPriceCents,
            costCents: li.costCents,
            sortOrder: i,
          })),
        },
        paymentSchedule: {
          create: estimate.paymentSchedule.map((p, i) => ({
            companyId,
            label: p.label,
            amountCents: p.amountCents,
            dueDate: p.dueDate,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/estimates/${estimateId}`);
  redirect(`/invoices/${invoice.id}`);
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

  const totalCents = Math.max(0, lineItemsTotal(estimate.lineItems) - estimate.discountCents);
  const emailBody = [
    `Hi ${estimate.customer.firstName},`,
    "",
    `Your estimate #${estimate.number} from ${estimate.company.name} is ready for review.`,
    "",
    `Total: ${formatCents(totalCents)}`,
    "",
    "We'll be in touch with details.",
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

  await prisma.estimate.update({
    where: { id: estimateId },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath(`/estimates/${estimateId}`);
  return { ok: true, skipped };
}

export async function deleteEstimate(estimateId: string) {
  const { companyId } = await requireSession();
  await prisma.estimate.deleteMany({ where: { id: estimateId, companyId } });
  redirect("/estimates");
}
