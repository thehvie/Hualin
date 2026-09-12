import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EstimateEditor } from "./estimate-editor";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      customer: { include: { properties: true } },
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      invoice: true,
    },
  });

  if (!estimate) notFound();

  const priceBookItems = await prisma.priceBookItem.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Link href="/estimates" className="hover:text-zinc-600">
          Estimates
        </Link>
      </p>
      <EstimateEditor
        estimate={{
          id: estimate.id,
          number: estimate.number,
          status: estimate.status,
          notes: estimate.notes,
          discountCents: estimate.discountCents,
          depositCents: estimate.depositCents,
          laborCostCents: estimate.laborCostCents,
          sentAt: estimate.sentAt ? estimate.sentAt.toISOString() : null,
          customer: {
            id: estimate.customer.id,
            name: `${estimate.customer.firstName} ${estimate.customer.lastName}`,
            email: estimate.customer.email,
            phone: estimate.customer.phone,
          },
          property: estimate.property
            ? {
                addressLine1: estimate.property.addressLine1,
                city: estimate.property.city,
                state: estimate.property.state,
                zip: estimate.property.zip,
              }
            : null,
          lineItems: estimate.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            unitPriceCents: li.unitPriceCents,
            costCents: li.costCents,
          })),
          paymentSchedule: estimate.paymentSchedule.map((p) => ({
            id: p.id,
            label: p.label,
            amountCents: p.amountCents,
            dueDate: p.dueDate ? p.dueDate.toISOString() : null,
          })),
          hasInvoice: !!estimate.invoice,
          invoiceId: estimate.invoice?.id ?? null,
        }}
        priceBookItems={priceBookItems.map((p) => ({
          id: p.id,
          name: p.name,
          unitPriceCents: p.unitPriceCents,
        }))}
      />
    </div>
  );
}
