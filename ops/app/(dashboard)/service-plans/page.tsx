import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { SUBSCRIPTION_STATUS_LABELS } from "@/lib/service-plans";
import { SubscribeClientButton } from "./subscribe-modal";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ServicePlansPage() {
  const { companyId } = await requireSession();

  const [subscriptions, plans, customers] = await Promise.all([
    prisma.servicePlanSubscription.findMany({
      where: { companyId },
      include: { servicePlan: true, customer: true, property: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.servicePlan.findMany({
      where: { companyId, archived: false },
      include: { billingOptions: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      include: { properties: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const pendingApproval = subscriptions.filter((s) => s.status === "DRAFT").length;
  const active = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const expiresSoon = subscriptions.filter((s) => s.status === "ACTIVE" && s.endDate && s.endDate <= in30Days).length;
  const expired = subscriptions.filter((s) => s.status === "EXPIRED").length;

  const invoiceIds = (
    await prisma.invoice.findMany({
      where: { companyId, servicePlanSubscriptionId: { not: null } },
      select: { id: true },
    })
  ).map((i) => i.id);
  const collectedRevenue = invoiceIds.length
    ? (
        await prisma.payment.aggregate({
          where: { companyId, invoiceId: { in: invoiceIds } },
          _sum: { amountCents: true },
        })
      )._sum.amountCents ?? 0
    : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Service Plans</h1>
        <div className="flex items-center gap-3">
          <Link href="/service-plans/manager" className="text-sm font-medium text-brand hover:underline">
            Service plans manager →
          </Link>
          <SubscribeClientButton
            customers={customers.map((c) => ({
              id: c.id,
              name: `${c.firstName} ${c.lastName}`,
              properties: c.properties.map((p) => ({ id: p.id, address: `${p.addressLine1}, ${p.city}` })),
            }))}
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              billingOptions: p.billingOptions.map((b) => ({ id: b.id, frequency: b.frequency, amountCents: b.amountCents })),
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard value={formatCents(collectedRevenue)} label="Collected revenue" />
        <StatCard value={`${pendingApproval}`} label="Pending approval" />
        <StatCard value={`${active}`} label="Active" />
        <StatCard value={`${expiresSoon}`} label="Expires soon" />
        <StatCard value={`${expired}`} label="Expired" />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-900">
          Client plans ({subscriptions.length})
        </div>
        {subscriptions.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-400">No client plans yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-5 py-2 font-medium">Plan</th>
                  <th className="px-5 py-2 font-medium">Client</th>
                  <th className="px-5 py-2 font-medium">Property</th>
                  <th className="px-5 py-2 font-medium">Price</th>
                  <th className="px-5 py-2 font-medium">Start (end)</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Next visit</th>
                  <th className="px-5 py-2 font-medium">Visits</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                    <td className="px-5 py-3">
                      <Link href={`/service-plans/${s.id}`} className="font-medium text-zinc-900 hover:text-brand">
                        {s.servicePlan.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/customers/${s.customerId}`} className="text-zinc-700 hover:text-brand">
                        {s.customer.firstName} {s.customer.lastName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-500">
                      {s.property ? `${s.property.addressLine1}, ${s.property.city}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{formatCents(s.priceCentsSnapshot)}</td>
                    <td className="px-5 py-3 text-zinc-500">
                      {formatDate(s.startDate)} {s.endDate && `(${formatDate(s.endDate)})`}
                    </td>
                    <td className="px-5 py-3 text-zinc-700">{SUBSCRIPTION_STATUS_LABELS[s.status] ?? s.status}</td>
                    <td className="px-5 py-3 text-zinc-500">{formatDate(s.nextVisitDate)}</td>
                    <td className="px-5 py-3 text-zinc-500">{s.visitsUsed}/{s.visitsTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
