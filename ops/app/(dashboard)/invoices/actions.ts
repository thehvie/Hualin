"use server";

import { revalidatePath } from "next/cache";
import { formatPhone } from "@/lib/phone";
import { redirect } from "next/navigation";
import { geocodeAddress } from "@/lib/geocode";
import { getDefaultTaxRate } from "@/lib/tax";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { recalcInvoiceStatus } from "@/lib/invoice-status";
import { computeInvoiceTotals } from "@/lib/invoice-totals";

export async function markInvoicesSent(ids: string[]) {
  if (ids.length === 0) return;
  const { companyId } = await requireSession();
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: { in: ["DRAFT", "SENT"] } },
    data: { status: "SENT", sentAt: new Date() },
  });
  revalidatePath("/invoices");
}

export async function deleteInvoices(ids: string[]) {
  if (ids.length === 0) return;
  const { companyId } = await requireSession();
  await prisma.invoice.deleteMany({ where: { id: { in: ids }, companyId } });
  revalidatePath("/invoices");
}

/**
 * Stage 1: no real delivery yet (Mailgun wiring lands in stage 2). Flags the
 * invoices as sent and reports how many could not actually be emailed.
 */
export async function sendInvoices(ids: string[]): Promise<{ sent: number; skipped: number }> {
  if (ids.length === 0) return { sent: 0, skipped: 0 };
  const { companyId } = await requireSession();
  const result = await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: { not: "VOID" } },
    data: { sentAt: new Date() },
  });
  await prisma.invoice.updateMany({
    where: { id: { in: ids }, companyId, status: "DRAFT" },
    data: { status: "SENT" },
  });
  revalidatePath("/invoices");
  return { sent: result.count, skipped: result.count };
}

export interface DirectInvoiceInput {
  customerId?: string;
  customer?: {
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
  };
  name: string;
}

/**
 * Creates a draft invoice for an existing or brand-new customer, with no estimate behind it, then opens it so line items
 * can be added. The company's default sales tax rate is applied, as it is for invoices made from estimates.
 */
export async function createDirectInvoice(input: DirectInvoiceInput): Promise<{ error: string } | void> {
  const { companyId } = await requireSession();
  const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

  let customerId: string;
  if (input.customerId) {
    const existing = await prisma.customer.findFirst({ where: { id: input.customerId, companyId }, select: { id: true } });
    if (!existing) return { error: "Please choose a customer." };
    customerId = existing.id;
  } else {
    const c = input.customer;
    if (!c) return { error: "Enter the customer's details." };
    const firstName = clean(c.firstName, 80);
    const lastName = clean(c.lastName, 80);
    if (!firstName || !lastName) return { error: "First and last name are required." };

    const addressLine1 = clean(c.addressLine1, 200);
    const city = clean(c.city, 100);
    const companyState = (await prisma.company.findUnique({ where: { id: companyId }, select: { state: true } }))?.state;
    const state = companyState || clean(c.state, 2).toUpperCase();
    const zip = clean(c.zip, 10);
    const hasAddress = !!(addressLine1 || city || zip);
    if (hasAddress && (!addressLine1 || !city || !state)) return { error: "Enter the full address (street, city and state), or leave it blank." };

    const geo = hasAddress ? await geocodeAddress(`${addressLine1}, ${city}, ${state} ${zip}, US`, companyId) : null;
    const customer = await prisma.customer.create({
      data: {
        companyId,
        firstName,
        lastName,
        companyName: clean(c.companyName, 120) || null,
        email: clean(c.email, 200) || null,
        phone: formatPhone(clean(c.phone, 40)) || null,
        source: "OTHER",
        ...(hasAddress
          ? {
              properties: {
                create: {
                  companyId,
                  addressLine1,
                  addressLine2: clean(c.addressLine2, 80) || null,
                  city,
                  state,
                  zip,
                  latitude: geo?.latitude ?? null,
                  longitude: geo?.longitude ?? null,
                },
              },
            }
          : {}),
      },
    });
    customerId = customer.id;
  }

  const taxRate = await getDefaultTaxRate(companyId);
  const invoice = await prisma.invoice.create({
    data: { companyId, customerId, status: "DRAFT", name: clean(input.name, 120) || null, taxRateId: taxRate?.id ?? null },
  });

  revalidatePath("/invoices");
  revalidatePath("/customers");
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Row dropdown on the invoice list. Unsent/Sent/Void just set the status. Paid records a payment for whatever is still
 * owed (method "Other"), so the books agree and the status isn't flipped back on the next recalculation. Partial is
 * automatic from payments. Unsent/Sent are refused while payments exist, because the payments decide the status.
 */
export async function setInvoiceStatus(id: string, status: string): Promise<{ error?: string }> {
  const { companyId } = await requireSession();
  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: { lineItems: true, payments: true, taxRate: true },
  });
  if (!invoice) return { error: "Invoice not found." };

  if (status === "DRAFT" || status === "SENT") {
    if (invoice.payments.length > 0) return { error: "This invoice has payments. Remove them first, or change the status by recording payments." };
    await prisma.invoice.update({
      where: { id },
      data: { status, sentAt: status === "SENT" ? (invoice.sentAt ?? new Date()) : null, paidAt: null },
    });
  } else if (status === "VOID") {
    await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });
  } else if (status === "PAID") {
    const totals = computeInvoiceTotals({
      lineItems: invoice.lineItems,
      discountCents: invoice.discountCents,
      fuelSurchargeCents: invoice.fuelSurchargeCents,
      tipCents: invoice.tipCents,
      taxRateBps: invoice.taxRate?.rateBps ?? 0,
      payments: invoice.payments,
    });
    if (totals.balanceCents > 0) {
      await prisma.payment.create({
        data: { companyId, invoiceId: id, amountCents: totals.balanceCents, method: "OTHER", reference: "Marked paid" },
      });
    }
    // A voided invoice must come back to a normal status before recalculation will touch it.
    if (invoice.status === "VOID") await prisma.invoice.update({ where: { id }, data: { status: invoice.sentAt ? "SENT" : "DRAFT" } });
    await recalcInvoiceStatus(id, companyId);
  } else {
    return { error: "That status is set automatically from payments." };
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  if (invoice.estimateId) {
    revalidatePath("/estimates");
    revalidatePath(`/estimates/${invoice.estimateId}`);
  }
  return {};
}
