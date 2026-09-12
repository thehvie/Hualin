import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents, lineItemsTotal } from "@/lib/money";
import { requireSession } from "@/lib/session";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await requireSession();
  const { q } = await searchParams;
  const query = (q || "").trim();

  const [customers, customerCount, unpaidInvoices, pendingEstimates] = await Promise.all([
    prisma.customer.findMany({
      where: {
        companyId,
        ...(query
          ? {
              OR: [
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { companyName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { properties: { take: 1, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.count({ where: { companyId } }),
    prisma.invoice.findMany({
      where: { companyId, status: { in: ["SENT", "PARTIALLY_PAID"] } },
      include: { lineItems: true, payments: true },
    }),
    prisma.estimate.findMany({
      where: { companyId, status: "SENT" },
      include: { lineItems: true },
    }),
  ]);

  const now = new Date();
  let totalDueCents = 0;
  let pastDueCents = 0;
  for (const inv of unpaidInvoices) {
    const total = lineItemsTotal(inv.lineItems);
    const paid = inv.payments.reduce((sum, p) => sum + p.amountCents, 0);
    const remaining = total - paid;
    totalDueCents += remaining;
    if (inv.dueAt && inv.dueAt < now) pastDueCents += remaining;
  }
  const estimatesPendingCents = pendingEstimates.reduce(
    (sum, e) => sum + lineItemsTotal(e.lineItems),
    0,
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Add Customer
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label="Customers" value={String(customerCount)} borderColor="border-zinc-300" />
        <SummaryCard
          label={`Due from ${unpaidInvoices.length} invoice${unpaidInvoices.length === 1 ? "" : "s"}`}
          value={formatCents(totalDueCents)}
          borderColor="border-amber-400"
        />
        <SummaryCard label="Past due" value={formatCents(pastDueCents)} borderColor="border-red-400" />
        <SummaryCard
          label="Estimates pending"
          value={formatCents(estimatesPendingCents)}
          borderColor="border-blue-400"
        />
      </div>

      <form className="flex" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search customers…"
          className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </form>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <span className="text-3xl">👤</span>
          <p className="text-sm font-semibold text-zinc-900">
            {query ? "No customers match your search" : "No customers yet"}
          </p>
          {!query && (
            <Link href="/customers/new" className="text-sm font-medium text-brand hover:underline">
              Add your first customer
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {customers.map((c) => (
              <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/customers/${c.id}`} className="font-semibold text-zinc-900">
                    {c.firstName} {c.lastName}
                  </Link>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-dark"
                    >
                      Call
                    </a>
                  )}
                </div>
                {c.companyName && <p className="text-sm text-zinc-500">{c.companyName}</p>}
                <dl className="mt-2 flex flex-col gap-1 text-sm text-zinc-600">
                  {c.phone && (
                    <div>
                      <a href={`tel:${c.phone}`} className="hover:text-brand">
                        {c.phone}
                      </a>
                    </div>
                  )}
                  {c.properties[0] && (
                    <div className="text-zinc-500">
                      {c.properties[0].addressLine1}, {c.properties[0].city}
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-medium text-zinc-900 hover:text-brand">
                        {c.firstName} {c.lastName}
                      </Link>
                      {c.email && <p className="text-xs text-zinc-400">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{c.companyName || "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:text-brand">
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {c.properties[0]
                        ? `${c.properties[0].addressLine1}, ${c.properties[0].city}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {c.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  borderColor,
}: {
  label: string;
  value: string;
  borderColor: string;
}) {
  return (
    <div className={`rounded-xl border-l-4 ${borderColor} border-y border-r border-zinc-200 bg-white p-4`}>
      <p className="text-xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
