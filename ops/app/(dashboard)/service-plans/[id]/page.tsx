import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { BILLING_FREQUENCY_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/service-plans";
import { CancelSubscriptionButton } from "./cancel-button";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ServicePlanSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { companyId } = await requireSession();
  const { id } = await params;

  const subscription = await prisma.servicePlanSubscription.findFirst({
    where: { id, companyId },
    include: {
      servicePlan: true,
      billingOption: true,
      customer: true,
      property: true,
      invoices: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!subscription) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Link href="/service-plans" className="hover:text-zinc-600">Service Plans</Link>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">{subscription.servicePlan.name}</h1>
        {subscription.status !== "CANCELLED" && <CancelSubscriptionButton subscriptionId={subscription.id} />}
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Customer</p>
          <Link href={`/customers/${subscription.customerId}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
            {subscription.customer.firstName} {subscription.customer.lastName}
          </Link>
          {subscription.customer.email && <p className="text-sm text-zinc-500">{subscription.customer.email}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Property</p>
          <p className="mt-1 text-sm text-zinc-700">
            {subscription.property ? `${subscription.property.addressLine1}, ${subscription.property.city}` : "No property on file"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-4">
        <Field label="Status" value={SUBSCRIPTION_STATUS_LABELS[subscription.status] ?? subscription.status} />
        <Field label="Price" value={`${formatCents(subscription.priceCentsSnapshot)} / ${BILLING_FREQUENCY_LABELS[subscription.billingOption.frequency]}`} />
        <Field label="Start (end)" value={`${formatDate(subscription.startDate)} (${formatDate(subscription.endDate)})`} />
        <Field label="Visits" value={`${subscription.visitsUsed}/${subscription.visitsTotal}`} />
      </div>

      {subscription.status === "DRAFT" && subscription.stripeCheckoutSessionId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This subscription is pending — the customer hasn't completed checkout yet.
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Invoices</p>
        {subscription.invoices.length === 0 ? (
          <p className="text-sm text-zinc-400">No invoices generated yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {subscription.invoices.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/invoices/${inv.id}`} className="font-medium text-zinc-900 hover:text-brand">
                  Invoice #{inv.number}
                </Link>
                <span className="text-zinc-400">{formatDate(inv.invoiceDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-900">{value}</p>
    </div>
  );
}
