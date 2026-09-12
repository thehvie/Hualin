import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  const s = startOfDay(d);
  return new Date(s.getTime() + 24 * 60 * 60 * 1000);
}
function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function DashboardHome() {
  const { companyId } = await requireSession();
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const fourteenDaysAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    customerCount,
    estimateCount,
    pendingEstimateCount,
    invoiceCount,
    unpaidInvoiceCount,
    salesLast14,
    salesToday,
    jobsDoneToday,
    jobsCancelledToday,
    jobStatusCounts,
    nextJob,
    recentActivity,
  ] = await Promise.all([
    prisma.customer.count({ where: { companyId } }),
    prisma.estimate.count({ where: { companyId } }),
    prisma.estimate.count({ where: { companyId, status: "SENT" } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId, status: { in: ["SENT", "PARTIALLY_PAID"] } } }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { companyId, createdAt: { gte: fourteenDaysAgo } },
    }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { companyId, createdAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.job.count({
      where: { companyId, status: "COMPLETED", completedAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.job.count({
      where: { companyId, status: "CANCELLED", updatedAt: { gte: todayStart, lt: todayEnd } },
    }),
    prisma.job.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
    prisma.job.findFirst({
      where: { companyId, scheduledAt: { gte: today }, status: { in: ["SCHEDULED", "UNSCHEDULED"] } },
      orderBy: { scheduledAt: "asc" },
      include: { customer: true },
    }),
    prisma.communication.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
  ]);

  const hasAnyCustomer = customerCount > 0;
  const statusMap = Object.fromEntries(jobStatusCounts.map((s) => [s.status, s._count._all]));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Home</h1>
        <p className="mt-1 text-sm text-zinc-500">Everything starts with a customer.</p>
      </div>

      {!hasAnyCustomer && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StepCard
            step="1"
            title="Add a customer"
            description="Every estimate starts with a customer and property."
            href="/customers/new"
            cta="Add Customer"
            active
          />
          <StepCard
            step="2"
            title="Create an estimate"
            description="Quote the job, then send it for approval."
            href="/estimates/new"
            cta="Create Estimate"
          />
          <StepCard
            step="3"
            title="Convert to an invoice"
            description="One click turns an approved estimate into an invoice."
            href="/invoices"
            cta="View Invoices"
          />
        </div>
      )}

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Widget title="Sales" subtitle="Last 14 days">
          {salesLast14._sum.amountCents ? (
            <div>
              <p className="text-3xl font-bold text-zinc-900">
                {formatCents(salesLast14._sum.amountCents)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">collected in the last 14 days</p>
            </div>
          ) : (
            <EmptyState
              icon="📈"
              title="No sales data available yet"
              description="Start recording payments to see your business performance and trends."
            />
          )}
          <WidgetFooter viewAllHref="/reports" addHref="/jobs/new" addLabel="Add job" />
        </Widget>

        <Widget title="Invoices" subtitle="All time" addHref="/invoices/new">
          {invoiceCount ? (
            <div>
              <p className="text-3xl font-bold text-zinc-900">{invoiceCount}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {unpaidInvoiceCount} awaiting payment
              </p>
            </div>
          ) : (
            <EmptyState
              icon="🧾"
              title="No invoices yet"
              description="Track your invoices and past-due payments here."
            />
          )}
          <WidgetFooter viewAllHref="/invoices" />
        </Widget>

        <Widget title="Estimates" subtitle="All time" addHref="/estimates/new">
          {estimateCount ? (
            <div>
              <p className="text-3xl font-bold text-zinc-900">{estimateCount}</p>
              <p className="mt-1 text-sm text-zinc-500">{pendingEstimateCount} awaiting response</p>
            </div>
          ) : (
            <EmptyState
              icon="📋"
              title="No estimates yet"
              description="Track your estimates and convert approved ones to invoices."
            />
          )}
          <WidgetFooter viewAllHref="/estimates" />
        </Widget>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Widget title="Today">
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row label="Sales" value={formatCents(salesToday._sum.amountCents ?? 0)} accent="green" />
            <Row label="Jobs done" value={String(jobsDoneToday)} accent="amber" />
            <Row label="Jobs cancelled" value={String(jobsCancelledToday)} accent="red" />
          </dl>
        </Widget>

        <Widget title="Coming up">
          {nextJob ? (
            <div className="text-sm">
              <p className="font-semibold text-zinc-900">
                {nextJob.customer.firstName} {nextJob.customer.lastName}
              </p>
              <p className="mt-1 text-zinc-500">
                {nextJob.scheduledAt?.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <Link href={`/jobs/${nextJob.id}`} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
                View job
              </Link>
            </div>
          ) : (
            <EmptyState icon="📅" title="Your schedule is clear" description="" compact>
              <Link href="/jobs/new" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">
                Schedule a job
              </Link>
            </EmptyState>
          )}
        </Widget>

        <Widget title="Jobs">
          <dl className="flex flex-col gap-2.5 text-sm">
            <Row label="Unscheduled" value={String(statusMap.UNSCHEDULED ?? 0)} accent="zinc" />
            <Row label="Scheduled" value={String(statusMap.SCHEDULED ?? 0)} accent="blue" />
            <Row label="In progress" value={String(statusMap.IN_PROGRESS ?? 0)} accent="amber" />
            <Row label="Completed" value={String(statusMap.COMPLETED ?? 0)} accent="green" />
          </dl>
        </Widget>

        <Widget title="Recent activity">
          {recentActivity.length ? (
            <ul className="flex flex-col gap-3 text-sm">
              {recentActivity.map((c) => (
                <li key={c.id} className="border-l-2 border-brand/30 pl-3">
                  <p className="text-zinc-700">
                    {c.direction === "OUTBOUND" ? "Sent" : "Received"} {c.channel.toLowerCase()}{" "}
                    {c.direction === "OUTBOUND" ? "to" : "from"}{" "}
                    <span className="font-medium text-zinc-900">
                      {c.customer.firstName} {c.customer.lastName}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">{timeAgo(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="🕓" title="No activity yet" description="Sent and received messages will show up here." compact />
          )}
        </Widget>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  href,
  cta,
  active,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-white p-5 ${
        active ? "border-brand ring-1 ring-brand" : "border-zinc-200"
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Step {step}
      </span>
      <h2 className="mt-1 text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-zinc-500">{description}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {cta}
      </Link>
    </div>
  );
}

function Widget({
  title,
  subtitle,
  addHref,
  children,
}: {
  title: string;
  subtitle?: string;
  addHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
        </div>
        {addHref && (
          <Link
            href={addHref}
            className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-white hover:bg-brand-dark"
            aria-label="Add"
          >
            +
          </Link>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function WidgetFooter({
  viewAllHref,
  addHref,
  addLabel,
}: {
  viewAllHref: string;
  addHref?: string;
  addLabel?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm">
      <Link href={viewAllHref} className="font-medium text-brand hover:underline">
        View all
      </Link>
      {addHref && addLabel && (
        <Link href={addHref} className="font-medium text-zinc-500 hover:text-zinc-800">
          + {addLabel}
        </Link>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  compact,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-2" : "py-6"}`}>
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl">
        {icon}
      </span>
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {description && <p className="mt-1 max-w-[220px] text-xs text-zinc-500">{description}</p>}
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "green" | "amber" | "red" | "blue" | "zinc";
}) {
  const borderColor = {
    green: "border-emerald-400",
    amber: "border-amber-400",
    red: "border-red-400",
    blue: "border-blue-400",
    zinc: "border-zinc-300",
  }[accent];

  return (
    <div className={`flex items-center justify-between border-l-2 ${borderColor} pl-3`}>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}
