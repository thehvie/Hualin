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
    include: { customer: true, property: true, estimate: true, invoice: true },
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
          estimateId: job.estimate?.id ?? null,
          estimateNumber: job.estimate?.number ?? null,
          invoiceId: job.invoice?.id ?? null,
          invoiceNumber: job.invoice?.number ?? null,
        }}
      />
    </div>
  );
}
