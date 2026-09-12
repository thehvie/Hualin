import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { InvoiceEditor } from "./invoice-editor";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, companyId },
    include: {
      customer: { include: { properties: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      taxRate: true,
      estimate: true,
      signature: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!invoice) notFound();

  const [priceBookItems, taxRates] = await Promise.all([
    prisma.priceBookItem.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" } }),
    prisma.taxRate.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" } }),
  ]);

  const property = invoice.customer.properties[0] ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Link href="/invoices" className="hover:text-zinc-600">
          Invoices
        </Link>
        {invoice.estimate && (
          <>
            {" / "}
            <Link href={`/estimates/${invoice.estimate.id}`} className="hover:text-zinc-600">
              from Estimate #{invoice.estimate.number}
            </Link>
          </>
        )}
      </p>

      <InvoiceEditor
        invoice={{
          id: invoice.id,
          number: invoice.number,
          name: invoice.name,
          status: invoice.status,
          notes: invoice.notes,
          invoiceDate: invoice.invoiceDate.toISOString(),
          dueAt: invoice.dueAt ? invoice.dueAt.toISOString() : null,
          sentAt: invoice.sentAt ? invoice.sentAt.toISOString() : null,
          discountCents: invoice.discountCents,
          depositCents: invoice.depositCents,
          tipCents: invoice.tipCents,
          laborCostCents: invoice.laborCostCents,
          taxRateId: invoice.taxRateId,
          publicToken: invoice.publicToken,
          customer: {
            id: invoice.customer.id,
            name: `${invoice.customer.firstName} ${invoice.customer.lastName}`,
            companyName: invoice.customer.companyName,
            email: invoice.customer.email,
            phone: invoice.customer.phone,
          },
          property: property
            ? {
                addressLine1: property.addressLine1,
                addressLine2: property.addressLine2,
                city: property.city,
                state: property.state,
                zip: property.zip,
              }
            : null,
          lineItems: invoice.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            unitPriceCents: li.unitPriceCents,
            costCents: li.costCents,
            taxable: li.taxable,
          })),
          paymentSchedule: invoice.paymentSchedule.map((p) => ({
            id: p.id,
            label: p.label,
            amountCents: p.amountCents,
            dueDate: p.dueDate ? p.dueDate.toISOString() : null,
          })),
          payments: invoice.payments.map((p) => ({
            id: p.id,
            amountCents: p.amountCents,
            method: p.method,
            reference: p.reference,
            createdAt: p.createdAt.toISOString(),
          })),
          signature: invoice.signature
            ? {
                signerName: invoice.signature.signerName,
                imageDataUrl: invoice.signature.imageDataUrl,
                signedAt: invoice.signature.signedAt.toISOString(),
              }
            : null,
          attachments: invoice.attachments.map((a) => ({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          })),
        }}
        taxRates={taxRates.map((t) => ({ id: t.id, name: t.name, rateBps: t.rateBps }))}
        priceBookItems={priceBookItems.map((p) => ({
          id: p.id,
          name: p.name,
          unitPriceCents: p.unitPriceCents,
          costCents: p.costCents,
        }))}
      />
    </div>
  );
}
