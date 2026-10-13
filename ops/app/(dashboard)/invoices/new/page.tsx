import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { NewInvoiceForm } from "./new-invoice-form";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const { companyId } = await requireSession();
  const { customerId } = await searchParams;

  const [company, customers] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { state: true } }),
    prisma.customer.findMany({ where: { companyId }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], take: 500 }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/invoices" className="hover:text-zinc-600">
            Invoices
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">New invoice</h1>
        <p className="mt-1 text-sm text-zinc-500">For work you didn&apos;t quote first. You&apos;ll add the items on the next screen.</p>
      </div>

      <NewInvoiceForm
        customers={customers.map((c) => ({
          id: c.id,
          label: `${c.firstName} ${c.lastName}${c.companyName ? ` — ${c.companyName}` : ""}`,
          detail: [c.email, c.phone].filter(Boolean).join(" · "),
        }))}
        preselectedCustomerId={customers.some((c) => c.id === customerId) ? (customerId ?? null) : null}
        defaultState={company.state}
      />
    </div>
  );
}
