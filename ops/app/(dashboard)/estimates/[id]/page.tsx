import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { messageChannel } from "@/lib/messaging";
import { estimateSigningUrl } from "@/lib/estimate-signing";
import { timezoneLabel } from "@/lib/tz";
import { getUsageStatus } from "@/lib/usage";
import { buildRoute, getDriveRoute, getOfficePoint, getPropertyPoint } from "@/lib/office";
import { EstimateEditor } from "./estimate-editor";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const estimate = await prisma.estimate.findFirst({
    where: { id, companyId },
    include: {
      customer: { include: { properties: true } },
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
      invoice: true,
      job: { include: { attachments: { orderBy: { createdAt: "asc" } } } },
      communications: {
        orderBy: { createdAt: "asc" },
        include: { attachments: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } } },
      },
    },
  });

  if (!estimate) notFound();

  const { timezone } = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });

  const usage = await getUsageStatus(companyId);
  const { state: companyState, fuelRateCentsPerMile, fuelFreeMiles, fuelRoundTrip } = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { state: true, fuelRateCentsPerMile: true, fuelFreeMiles: true, fuelRoundTrip: true },
  });
  const office = await getOfficePoint(companyId);
  const destination = estimate.property ? await getPropertyPoint(companyId, estimate.property) : null;
  const route = buildRoute(office, destination, await getDriveRoute(companyId, office, destination), usage.capped);

  // Opening the estimate counts as reading the customer's messages (they're still flagged New on this visit).
  await prisma.communication.updateMany({
    where: { estimateId: estimate.id, companyId, direction: "INBOUND", readAt: null },
    data: { readAt: new Date() },
  });

  const priceBookItems = await prisma.priceBookItem.findMany({
    where: { companyId, active: true },
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
          notes: estimate.job?.notes ?? estimate.notes,
          discountCents: estimate.discountCents,
          fuelSurchargeCents: estimate.fuelSurchargeCents,
          depositCents: estimate.depositCents,
          laborCostCents: estimate.laborCostCents,
          sentAt: estimate.sentAt ? estimate.sentAt.toISOString() : null,
          customer: {
            id: estimate.customer.id,
            firstName: estimate.customer.firstName,
            lastName: estimate.customer.lastName,
            companyName: estimate.customer.companyName,
            name: `${estimate.customer.firstName} ${estimate.customer.lastName}`,
            email: estimate.customer.email,
            phone: estimate.customer.phone,
            messageChannel: messageChannel(estimate.customer),
          },
          property: estimate.property
            ? {
                addressLine1: estimate.property.addressLine1,
                addressLine2: estimate.property.addressLine2,
                city: estimate.property.city,
                state: estimate.property.state,
                zip: estimate.property.zip,
              }
            : null,
          lineItems: estimate.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantity: li.quantity,
            isRental: li.isRental,
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
          jobId: estimate.job?.id ?? null,
          jobStatus: estimate.job?.status ?? null,
          scheduledAt: estimate.job?.scheduledAt ? estimate.job.scheduledAt.toISOString() : null,
          scheduledEndAt: estimate.job?.scheduledEndAt ? estimate.job.scheduledEndAt.toISOString() : null,
          timezone,
          route,
          companyState,
          fuel: { rateCentsPerMile: fuelRateCentsPerMile, freeMiles: fuelFreeMiles, roundTrip: fuelRoundTrip },
          timezoneName: timezoneLabel(timezone),
          attachments: (estimate.job?.attachments ?? []).map((a) => ({ id: a.id, filename: a.filename, dataUrl: a.dataUrl })),
          signingUrl: estimate.publicToken ? estimateSigningUrl(estimate.publicToken) : null,
          signedName: estimate.signedName,
          signedAt: estimate.signedAt ? estimate.signedAt.toISOString() : null,
          communications: estimate.communications.map((c) => ({
            id: c.id,
            direction: c.direction,
            channel: c.channel,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            attachments: c.attachments,
            isNew: c.direction === "INBOUND" && !c.readAt,
            senderVerified: c.senderVerified,
          })),
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
