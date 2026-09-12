"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { requireSession } from "@/lib/session";

function toCents(value: string): number {
  const n = Math.round(parseFloat(value || "0") * 100);
  return Number.isFinite(n) ? n : 0;
}

const INVOICE_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "VOID"] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const PAYMENT_METHODS = ["CARD", "CASH", "CHECK", "ACH", "OTHER"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

function revalidate(invoiceId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

async function assertInvoiceOwnership(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId } });
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
}

// ── Line items ───────────────────────────────────────────────────────────

export async function addLineItem(invoiceId: string, formData: FormData) {
  const { companyId } = await requireSession();
  await assertInvoiceOwnership(invoiceId, companyId);

  const description = String(formData.get("description") || "").trim();
  const quantity = parseInt(String(formData.get("quantity") || "1"), 10) || 1;
  const unitPriceCents = toCents(String(formData.get("unitPrice") || "0"));
  const costCents = formData.get("cost") ? toCents(String(formData.get("cost"))) : null;
  const taxable = formData.get("taxable") === "on";
  const saveToPriceBook = formData.get("saveToPriceBook") === "on";

  if (!description) return;

  let priceBookItemId: string | null = null;
  if (saveToPriceBook) {
    const priceBookItem = await prisma.priceBookItem.create({
      data: { companyId, name: description, unitPriceCents, costCents },
    });
    priceBookItemId = priceBookItem.id;
  }

  const count = await prisma.invoiceLineItem.count({ where: { invoiceId, companyId } });
  await prisma.invoiceLineItem.create({
    data: {
      companyId,
      invoiceId,
      description,
      quantity,
      unitPriceCents,
      costCents,
      taxable,
      priceBookItemId,
      sortOrder: count,
    },
  });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
  if (saveToPriceBook) revalidatePath("/price-book");
}

export async function addLineItemFromPriceBook(invoiceId: string, priceBookItemId: string) {
  const { companyId } = await requireSession();
  await assertInvoiceOwnership(invoiceId, companyId);

  const item = await prisma.priceBookItem.findFirst({ where: { id: priceBookItemId, companyId } });
  if (!item) return;

  const count = await prisma.invoiceLineItem.count({ where: { invoiceId, companyId } });
  await prisma.invoiceLineItem.create({
    data: {
      companyId,
      invoiceId,
      priceBookItemId: item.id,
      description: item.name,
      quantity: 1,
      unitPriceCents: item.unitPriceCents,
      costCents: item.costCents,
      sortOrder: count,
    },
  });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
}

export async function removeLineItem(invoiceId: string, lineItemId: string) {
  const { companyId } = await requireSession();
  await prisma.invoiceLineItem.deleteMany({ where: { id: lineItemId, invoiceId, companyId } });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
}

export async function setLineItemTaxable(invoiceId: string, lineItemId: string, taxable: boolean) {
  const { companyId } = await requireSession();
  await prisma.invoiceLineItem.updateMany({
    where: { id: lineItemId, invoiceId, companyId },
    data: { taxable },
  });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
}

// ── Header ───────────────────────────────────────────────────────────────

export async function updateInvoiceHeader(invoiceId: string, formData: FormData) {
  const { companyId } = await requireSession();

  const status = String(formData.get("status") || "DRAFT");
  const name = String(formData.get("name") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const invoiceDateStr = String(formData.get("invoiceDate") || "");
  const dueDateStr = String(formData.get("dueAt") || "");
  const taxRateId = String(formData.get("taxRateId") || "");
  const discountCents = toCents(String(formData.get("discount") || "0"));
  const depositCents = toCents(String(formData.get("deposit") || "0"));
  const tipCents = toCents(String(formData.get("tip") || "0"));
  const laborCostCents = toCents(String(formData.get("laborCost") || "0"));

  if (!INVOICE_STATUSES.includes(status as InvoiceStatus)) return;

  await prisma.invoice.updateMany({
    where: { id: invoiceId, companyId },
    data: {
      status: status as InvoiceStatus,
      name: name || null,
      notes: notes || null,
      invoiceDate: invoiceDateStr ? new Date(invoiceDateStr) : undefined,
      dueAt: dueDateStr ? new Date(dueDateStr) : null,
      taxRateId: taxRateId || null,
      discountCents,
      depositCents,
      tipCents,
      laborCostCents,
    },
  });
  revalidate(invoiceId);
}

export async function voidInvoice(invoiceId: string) {
  const { companyId } = await requireSession();
  await prisma.invoice.updateMany({ where: { id: invoiceId, companyId }, data: { status: "VOID" } });
  revalidate(invoiceId);
}

export async function deleteInvoice(invoiceId: string) {
  const { companyId } = await requireSession();
  await prisma.invoice.deleteMany({ where: { id: invoiceId, companyId } });
  redirect("/invoices");
}

// ── Payment schedule ─────────────────────────────────────────────────────

export async function addPaymentScheduleItem(invoiceId: string, formData: FormData) {
  const { companyId } = await requireSession();
  await assertInvoiceOwnership(invoiceId, companyId);

  const label = String(formData.get("label") || "").trim();
  const amountCents = toCents(String(formData.get("amount") || "0"));
  const dueDateStr = String(formData.get("dueDate") || "");

  if (!label) return;

  const count = await prisma.invoicePaymentScheduleItem.count({ where: { invoiceId, companyId } });
  await prisma.invoicePaymentScheduleItem.create({
    data: {
      companyId,
      invoiceId,
      label,
      amountCents,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      sortOrder: count,
    },
  });
  revalidate(invoiceId);
}

export async function removePaymentScheduleItem(invoiceId: string, itemId: string) {
  const { companyId } = await requireSession();
  await prisma.invoicePaymentScheduleItem.deleteMany({
    where: { id: itemId, invoiceId, companyId },
  });
  revalidate(invoiceId);
}

// ── Payments ─────────────────────────────────────────────────────────────

export async function addPayment(invoiceId: string, formData: FormData) {
  const { companyId } = await requireSession();
  await assertInvoiceOwnership(invoiceId, companyId);

  const amountCents = toCents(String(formData.get("amount") || "0"));
  const method = String(formData.get("method") || "OTHER");
  const reference = String(formData.get("reference") || "").trim();

  if (amountCents <= 0) return;
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) return;

  await prisma.payment.create({
    data: {
      companyId,
      invoiceId,
      amountCents,
      method: method as PaymentMethod,
      reference: reference || null,
    },
  });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
}

export async function removePayment(invoiceId: string, paymentId: string) {
  const { companyId } = await requireSession();
  await prisma.payment.deleteMany({ where: { id: paymentId, invoiceId, companyId } });
  await recalcInvoiceStatus(invoiceId, companyId);
  revalidate(invoiceId);
}

// ── Send (stage 1 stub — real Mailgun delivery lands in stage 2) ──────────

export async function sendInvoice(
  invoiceId: string,
): Promise<{ ok: boolean; skipped: boolean; error?: string }> {
  const { companyId } = await requireSession();

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { customer: true },
  });
  if (!invoice) return { ok: false, skipped: false, error: "Invoice not found." };
  if (!invoice.customer.email) {
    return { ok: false, skipped: false, error: "This customer has no email address on file." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      sentAt: new Date(),
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
    },
  });
  revalidate(invoiceId);
  // Mailgun isn't wired yet, so nothing was actually emailed.
  return { ok: true, skipped: true };
}

// ── Status recompute ─────────────────────────────────────────────────────

/**
 * Recomputes PAID / PARTIALLY_PAID from payments vs. the invoice total.
 * Leaves DRAFT/SENT alone when nothing has been paid, and never touches VOID.
 * Internal helper only — callers have already verified companyId ownership.
 */
async function recalcInvoiceStatus(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lineItems: true, payments: true, taxRate: true },
  });
  if (!invoice || invoice.status === "VOID") return;

  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    tipCents: invoice.tipCents,
    taxRateBps: invoice.taxRate?.rateBps ?? 0,
    payments: invoice.payments,
  });

  let status: InvoiceStatus = invoice.status as InvoiceStatus;
  let paidAt = invoice.paidAt;

  if (totals.paidCents <= 0) {
    if (invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID") {
      status = invoice.sentAt ? "SENT" : "DRAFT";
      paidAt = null;
    }
  } else if (totals.balanceCents <= 0 && totals.totalCents > 0) {
    status = "PAID";
    paidAt = paidAt ?? new Date();
  } else {
    status = "PARTIALLY_PAID";
    paidAt = null;
  }

  if (status !== invoice.status || paidAt !== invoice.paidAt) {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { status, paidAt } });
  }
}
