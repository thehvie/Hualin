import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { requireSession } from "@/lib/session";
import { InvoicesTable, type InvoiceRow } from "./invoices-table";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Sent",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  VOID: "Void",
};

const ALL_STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "VOID"];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { companyId } = await requireSession();
  const { q, status } = await searchParams;
  const query = (q || "").trim();

  const numericQuery = /^\d+$/.test(query) ? parseInt(query, 10) : undefined;

  const searchOr = query
    ? [
        ...(numericQuery !== undefined ? [{ number: { equals: numericQuery } }] : []),
        { name: { contains: query, mode: "insensitive" as const } },
        { customer: { firstName: { contains: query, mode: "insensitive" as const } } },
        { customer: { lastName: { contains: query, mode: "insensitive" as const } } },
        { customer: { companyName: { contains: query, mode: "insensitive" as const } } },
      ]
    : undefined;

  const [invoices, jobsNeedingInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, ...(searchOr ? { OR: searchOr } : {}) },
      include: {
        customer: true,
        lineItems: true,
        payments: true,
        taxRate: true,
        job: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.count({ where: { companyId, invoice: null, status: "COMPLETED" } }),
  ]);

  const now = Date.now();

  const rows: InvoiceRow[] = invoices.map((inv) => {
    const totals = computeInvoiceTotals({
      lineItems: inv.lineItems,
      discountCents: inv.discountCents,
      tipCents: inv.tipCents,
      taxRateBps: inv.taxRate?.rateBps ?? 0,
      payments: inv.payments,
    });
    return {
      id: inv.id,
      number: inv.number,
      name: inv.name,
      customerId: inv.customerId,
      customerName: `${inv.customer.firstName} ${inv.customer.lastName}`,
      companyName: inv.customer.companyName,
      createdAt: inv.createdAt.toISOString(),
      dueAt: inv.dueAt ? inv.dueAt.toISOString() : null,
      sent: !!inv.sentAt,
      status: inv.status,
      jobName: inv.job ? (inv.job.notes?.split("\n")[0]?.slice(0, 40) || `Job ${inv.jobId}`) : null,
      subtotalCents: totals.subtotalCents,
      taxCents: totals.taxCents,
      discountCents: totals.discountCents,
      totalCents: totals.totalCents,
      balanceCents: totals.balanceCents,
    };
  });

  const openRows = rows.filter((r) => r.status === "SENT" || r.status === "PARTIALLY_PAID");
  const dueTotal = openRows.reduce((sum, r) => sum + Math.max(0, r.balanceCents), 0);
  const overdueRows = openRows.filter((r) => r.dueAt && new Date(r.dueAt).getTime() < now);
  const overdueTotal = overdueRows.reduce((sum, r) => sum + Math.max(0, r.balanceCents), 0);
  const unsentCount = rows.filter((r) => !r.sent && r.status !== "VOID").length;

  const filtered =
    status && status !== "ALL" ? rows.filter((r) => r.status === status) : rows;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Invoices</h1>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={formatCents(dueTotal)} label={`Due from ${openRows.length} invoice${openRows.length === 1 ? "" : "s"}`} />
        <StatCard value={formatCents(overdueTotal)} label={`Overdue from ${overdueRows.length} invoice${overdueRows.length === 1 ? "" : "s"}`} />
        <StatCard value={`${unsentCount}`} label="Unsent" />
        <StatCard value={`${jobsNeedingInvoices}`} label="Completed jobs need invoices" />
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
          placeholder="Search by client, invoice name or #…"
          className="w-full max-w-sm rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Apply
        </button>
        {status && (
          <Link href={query ? `/invoices?q=${query}` : "/invoices"} className="text-sm font-medium text-zinc-500 hover:text-zinc-800">
            Clear filter: {STATUS_LABELS[status]} ✕
          </Link>
        )}
      </form>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <span className="text-3xl">🧾</span>
          <p className="text-sm font-semibold text-zinc-900">
            {query || status ? "No invoices match" : "No invoices yet"}
          </p>
          {!query && !status && (
            <p className="text-sm text-zinc-500">
              Approve an estimate and mark it as won to create your first invoice.
            </p>
          )}
        </div>
      ) : (
        <InvoicesTable invoices={filtered} />
      )}
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-right text-xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-right text-xs text-zinc-500">{label}</p>
    </div>
  );
}
