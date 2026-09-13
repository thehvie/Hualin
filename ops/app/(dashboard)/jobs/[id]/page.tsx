import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { JobEditor } from "./job-editor";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const job = await prisma.job.findFirst({
    where: { id, companyId },
    include: {
      customer: true,
      property: true,
      estimates: { orderBy: { createdAt: "asc" }, include: { invoice: true } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!job) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Link href="/schedule" className="hover:text-zinc-600">Schedule</Link>
      </p>

      <JobEditor
        job={{
          id: job.id,
          status: job.status,
          scheduledAt: job.scheduledAt ? job.scheduledAt.toISOString() : null,
          notes: job.notes,
          customer: {
            id: job.customer.id,
            name: `${job.customer.firstName} ${job.customer.lastName}`,
            email: job.customer.email,
            phone: job.customer.phone,
          },
          property: job.property
            ? {
                addressLine1: job.property.addressLine1,
                addressLine2: job.property.addressLine2,
                city: job.property.city,
                state: job.property.state,
                zip: job.property.zip,
              }
            : null,
          estimates: job.estimates.map((e) => ({
            id: e.id,
            number: e.number,
            status: e.status,
            invoiceId: e.invoice?.id ?? null,
            invoiceNumber: e.invoice?.number ?? null,
          })),
          attachments: job.attachments.map((a) => ({ id: a.id, filename: a.filename, dataUrl: a.dataUrl })),
        }}
      />
    </div>
  );
}
