import { prisma } from "@/lib/prisma";
import { getDefaultTaxRate } from "@/lib/tax";

/**
 * Creates a draft invoice from an approved estimate, copying line items and the
 * payment schedule. Invoices are created when the job is complete, not when the
 * customer approves the estimate.
 */
export async function createInvoiceFromEstimate(
  estimateId: string,
  companyId: string,
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
  if (estimate.status !== "APPROVED") return { error: "Only approved estimates can be invoiced." };
  if (estimate.job && estimate.job.status !== "COMPLETED") {
    return { error: "Mark the job as completed before creating the invoice." };
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
  return { invoiceId: invoice.id };
}
