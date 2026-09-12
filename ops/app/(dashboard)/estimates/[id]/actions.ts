"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function toCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

export async function addLineItem(estimateId: string, formData: FormData) {
  const description = String(formData.get("description") || "").trim();
  const quantity = parseInt(String(formData.get("quantity") || "1"), 10) || 1;
  const unitPriceCents = toCents(String(formData.get("unitPrice") || "0"));
  const costCents = formData.get("cost") ? toCents(String(formData.get("cost"))) : null;
  const saveToPriceBook = formData.get("saveToPriceBook") === "on";

  if (!description) return;

  let priceBookItemId: string | null = null;
  if (saveToPriceBook) {
    const priceBookItem = await prisma.priceBookItem.create({
      data: { name: description, unitPriceCents, costCents },
    });
    priceBookItemId = priceBookItem.id;
  }

  const count = await prisma.estimateLineItem.count({ where: { estimateId } });
  await prisma.estimateLineItem.create({
    data: { estimateId, description, quantity, unitPriceCents, costCents, priceBookItemId, sortOrder: count },
  });
  revalidatePath(`/estimates/${estimateId}`);
  if (saveToPriceBook) revalidatePath("/price-book");
}

export async function addLineItemFromPriceBook(estimateId: string, priceBookItemId: string) {
  const item = await prisma.priceBookItem.findUnique({ where: { id: priceBookItemId } });
  if (!item) return;

  const count = await prisma.estimateLineItem.count({ where: { estimateId } });
  await prisma.estimateLineItem.create({
    data: {
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
  await prisma.estimateLineItem.delete({ where: { id: lineItemId } });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function updateEstimateHeader(estimateId: string, formData: FormData) {
  const status = String(formData.get("status") || "DRAFT");
  const notes = String(formData.get("notes") || "").trim();
  const discountCents = toCents(String(formData.get("discount") || "0"));
  const depositCents = toCents(String(formData.get("deposit") || "0"));
  const laborCostCents = toCents(String(formData.get("laborCost") || "0"));

  await prisma.estimate.update({
    where: { id: estimateId },
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
  const label = String(formData.get("label") || "").trim();
  const amountCents = toCents(String(formData.get("amount") || "0"));
  const dueDateStr = String(formData.get("dueDate") || "");

  if (!label) return;

  const count = await prisma.estimatePaymentScheduleItem.count({ where: { estimateId } });
  await prisma.estimatePaymentScheduleItem.create({
    data: {
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
  await prisma.estimatePaymentScheduleItem.delete({ where: { id: itemId } });
  revalidatePath(`/estimates/${estimateId}`);
}

/**
 * The core workflow: approve the estimate and one-click convert it to an Invoice,
 * copying the line items over.
 */
export async function markAsWon(estimateId: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
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

export async function sendEstimate(estimateId: string) {
  await prisma.estimate.update({
    where: { id: estimateId },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath(`/estimates/${estimateId}`);
}

export async function deleteEstimate(estimateId: string) {
  await prisma.estimate.delete({ where: { id: estimateId } });
  redirect("/estimates");
}
