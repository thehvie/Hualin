import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { BILLING_FREQUENCY_LABELS, formatDuration } from "@/lib/service-plans";
import { CreatePlanButton, EditPlanTrigger } from "./plan-modal";
import { setServicePlanArchived } from "./actions";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ServicePlansManagerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { companyId } = await requireSession();
  const { tab } = await searchParams;
  const showArchived = tab === "archived";

  const [plans, jobTypes] = await Promise.all([
    prisma.servicePlan.findMany({
      where: { companyId },
      include: { billingOptions: { orderBy: { sortOrder: "asc" } }, _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.priceBookItem.findMany({
      where: { companyId, type: "SERVICE", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const templates = plans.filter((p) => !p.archived);
  const archived = plans.filter((p) => p.archived);
  const visible = showArchived ? archived : templates;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            <Link href="/service-plans" className="hover:text-zinc-600">Service Plans</Link>
          </p>
          <h1 className="text-xl font-bold text-zinc-900">Service plans manager</h1>
        </div>
        <CreatePlanButton jobTypes={jobTypes} />
      </div>

      <div className="flex gap-5 border-b border-zinc-200">
        <Link
          href="/service-plans/manager"
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold ${
            !showArchived ? "border-brand text-brand-dark" : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          My templates ({templates.length})
        </Link>
        <Link
          href="/service-plans/manager?tab=archived"
          className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold ${
            showArchived ? "border-brand text-brand-dark" : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          Archived ({archived.length})
        </Link>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">
          {showArchived ? "No archived plans." : "No plan templates yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-zinc-200 bg-white p-5">
              <EditPlanTrigger
                jobTypes={jobTypes}
                plan={{
                  id: plan.id,
                  name: plan.name,
                  scopeOfWork: plan.scopeOfWork,
                  durationValue: plan.durationValue,
                  durationUnit: plan.durationUnit,
                  autoRenew: plan.autoRenew,
                  visitsPerPeriod: plan.visitsPerPeriod,
                  jobTypeId: plan.jobTypeId,
                  priceCents: plan.priceCents,
                  billingOptions: plan.billingOptions.map((b) => ({
                    frequency: b.frequency,
                    discountPercent: b.discountPercent,
                    amountCents: b.amountCents,
                  })),
                }}
              >
                <h2 className="text-lg font-bold text-zinc-900">{plan.name}</h2>
                <p className="text-2xl font-bold text-zinc-900">{formatCents(plan.priceCents)}</p>
              </EditPlanTrigger>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>
                  {formatDuration(plan.durationValue, plan.durationUnit)}
                </span>
                <span>{plan.visitsPerPeriod} visits</span>
                <span>{plan.billingOptions.map((b) => BILLING_FREQUENCY_LABELS[b.frequency]).join(" · ")}</span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                <span>Created {formatDate(plan.createdAt)}</span>
                <span>{plan._count.subscriptions} client{plan._count.subscriptions === 1 ? "" : "s"} subscribed</span>
              </div>

              <form action={setServicePlanArchived.bind(null, plan.id, !plan.archived)} className="mt-3">
                <button type="submit" className="text-xs font-medium text-zinc-500 hover:text-brand">
                  {plan.archived ? "Restore plan" : "Archive plan"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
