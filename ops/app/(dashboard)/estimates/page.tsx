import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents, lineItemsTotal } from "@/lib/money";
import { requireSession } from "@/lib/session";
import { EstimatesTable, type EstimateRow } from "./estimates-table";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  WON: "Won",
  EXPIRED: "Archived",
};

const ALL_STATUSES = ["DRAFT", "SENT", "APPROVED", "DECLINED", "WON", "EXPIRED"];

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { companyId } = await requireSession();
  const { q, status } = await searchParams;
  const query = (q || "").trim();

  const estimates = await prisma.estimate.findMany({
    where: {
      companyId,
      ...(query
        ? {
            OR: [
              { customer: { firstName: { contains: query, mode: "insensitive" } } },
              { customer: { lastName: { contains: query, mode: "insensitive" } } },
              { customer: { companyName: { contains: query, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { customer: true, lineItems: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  // Derive a display status: APPROVED + already has an Invoice reads as "Won".
  const withDisplayStatus: EstimateRow[] = estimates.map((e) => ({
    id: e.id,
    number: e.number,
    customerId: e.customerId,
    customerName: `${e.customer.firstName} ${e.customer.lastName}`,
    companyName: e.customer.companyName,
    source: e.customer.source,
    createdAt: e.createdAt.toISOString(),
    amountCents: lineItemsTotal(e.lineItems),
    displayStatus: e.status === "APPROVED" && e.invoice ? "WON" : e.status,
  }));

  const filtered = status && status !== "ALL"
    ? withDisplayStatus.filter((e) => e.displayStatus === status)
    : withDisplayStatus;

  const summary = ALL_STATUSES.map((s) => {
    const matches = withDisplayStatus.filter((e) => e.displayStatus === s);
    return {
      status: s,
      label: STATUS_LABELS[s],
      count: matches.length,
      worthCents: matches.reduce((sum, e) => sum + e.amountCents, 0),
    };
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Estimates</h1>
        <Link
          href="/estimates/new"
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + New Estimate
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((s) => (
          <Link
            key={s.status}
            href={`/estimates?status=${s.status}`}
            className={`rounded-xl border p-4 transition-colors ${
              status === s.status
                ? "border-brand bg-brand/5"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <p className="text-sm font-semibold text-zinc-900">{s.label}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {s.count} worth {formatCents(s.worthCents)}
            </p>
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-3" method="get">
        <select
          name="status"
          defaultValue={status || "ALL"}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="ALL">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search estimates…"
          className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Apply
        </button>
        {status && (
          <Link href={query ? `/estimates?q=${query}` : "/estimates"} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            Clear filter: {STATUS_LABELS[status]} ✕
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <span className="text-3xl">📋</span>
          <p className="text-sm font-semibold text-zinc-900">
            {query || status ? "No estimates match" : "No estimates yet"}
          </p>
          {!query && !status && (
            <Link href="/estimates/new" className="text-sm font-medium text-brand hover:underline">
              Create your first estimate
            </Link>
          )}
        </div>
      ) : (
        <EstimatesTable estimates={filtered} />
      )}
    </div>
  );
}
