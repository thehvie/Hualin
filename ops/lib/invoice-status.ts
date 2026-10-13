import { prisma } from "@/lib/prisma";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import type { InvoiceStatus } from "@prisma/client";

/**
 * Recomputes PAID / PARTIALLY_PAID from payments vs. the invoice total.
 * Leaves DRAFT/SENT alone when nothing has been paid, and never touches VOID.
 * Internal helper only — callers have already verified companyId ownership.
 */
export async function recalcInvoiceStatus(invoiceId: string, companyId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: { lineItems: true, payments: true, taxRate: true },
  });
  if (!invoice || invoice.status === "VOID") return;

  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    fuelSurchargeCents: invoice.fuelSurchargeCents,
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
