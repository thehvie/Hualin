import { prisma } from "@/lib/prisma";
import { getDefaultTaxRate } from "@/lib/tax";
import { rentalCharges } from "@/lib/rental-charges";
import { recalcInvoiceStatus } from "@/lib/invoice-status";

/**
 * Creates a draft invoice from an approved estimate, copying line items and the
 * payment schedule. Invoices are created when the job is complete, not when the
 * customer approves the estimate.
 */
export async function createInvoiceFromEstimate(
  estimateId: string,
  companyId: string,
  // `force` is for "Convert to invoice": it skips the approved-and-job-complete checks (cash jobs, work done without a signature).
  options: { force?: boolean } = {},
): Promise<{ invoiceId: string } | { error: string }> {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      lineItems: true,
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      invoice: true,
      job: true,
    },
  });
  if (!estimate) return { error: "Estimate not found." };
  if (estimate.invoice) return { invoiceId: estimate.invoice.id };
  if (options.force) {
    if (estimate.status === "DECLINED" || estimate.status === "EXPIRED") {
      return { error: "This estimate is marked declined or archived. Change its status first, then convert it." };
    }
  } else {
    if (estimate.status !== "APPROVED") return { error: "Only approved estimates can be invoiced." };
    if (estimate.job && estimate.job.status !== "COMPLETED") {
      return { error: "Mark the job as completed before creating the invoice." };
    }
  }
  if (estimate.lineItems.length === 0) return { error: "This estimate has no line items." };

  // With a sales tax rate set in Settings, new invoices use it and their items start out taxable
  // (each line can still be switched off on the invoice).
  const taxRate = await getDefaultTaxRate(companyId);

  const invoice = await prisma.invoice.create({
    data: {
      companyId,
      taxRateId: taxRate?.id ?? null,
      customerId: estimate.customerId,
      estimateId: estimate.id,
      jobId: estimate.jobId ?? undefined,
      status: "DRAFT",
      name: `Invoice for Estimate #${estimate.number}`,
      notes: estimate.notes,
      discountCents: estimate.discountCents,
      fuelSurchargeCents: estimate.fuelSurchargeCents,
      depositCents: estimate.depositCents,
      laborCostCents: estimate.laborCostCents,
      lineItems: {
        create: estimate.lineItems.map((li, i) => ({
          companyId,
          priceBookItemId: li.priceBookItemId,
          description: li.description,
          quantity: li.quantity,
          isRental: li.isRental,
          taxable: !!taxRate,
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
  });

  if (options.force && estimate.status !== "APPROVED") {
    await prisma.estimate.update({ where: { id: estimateId }, data: { status: "APPROVED" } });
  }

  // Dumpsters that came back: bill the days kept past the package and any weight over the allowance.
  if (estimate.jobId) {
    const [bookings, company] = await Promise.all([
      prisma.rentalBooking.findMany({ where: { jobId: estimate.jobId, companyId, status: "PICKED_UP" }, orderBy: { createdAt: "asc" } }),
      prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } }),
    ]);
    const itemIds = [...new Set(bookings.map((b) => b.priceBookItemId).filter((x): x is string => !!x))];
    const items = itemIds.length
      ? await prisma.priceBookItem.findMany({ where: { id: { in: itemIds }, companyId } })
      : [];
    const extra = bookings.flatMap((b) => {
      const item = items.find((i) => i.id === b.priceBookItemId) ?? null;
      return rentalCharges(b, item, company.timezone)?.lines ?? [];
    });
    if (extra.length > 0) {
      await prisma.invoiceLineItem.createMany({
        data: extra.map((l, i) => ({
          companyId,
          invoiceId: invoice.id,
          description: l.description,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          isRental: false,
          taxable: !!taxRate,
          sortOrder: estimate.lineItems.length + i,
        })),
      });
    }
  }

  // A deposit the customer already paid becomes a payment on the invoice, so it shows the balance still owed.
  if (estimate.depositPaidCents > 0) {
    await prisma.payment.create({
      data: {
        companyId,
        invoiceId: invoice.id,
        amountCents: estimate.depositPaidCents,
        method: estimate.depositPaidMethod ?? "OTHER",
        reference: `Deposit from estimate #${estimate.number}${estimate.depositPaidReference ? `: ${estimate.depositPaidReference}` : ""}`,
        createdAt: estimate.depositPaidAt ?? new Date(),
      },
    });
    await recalcInvoiceStatus(invoice.id, companyId);
  }

  return { invoiceId: invoice.id };
}
