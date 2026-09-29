import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { poTotalCents, formatVendorAddress, PO_STATUS_LABELS, PO_STATUS_STYLES } from "@/lib/purchase-orders";
import { PoStatusSelect } from "../status-select";
import { PoActions } from "./po-actions";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";
}

export default async function PurchaseOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ note?: string }>;
}) {
  const { companyId } = await requireSession();
  const { id } = await params;
  const { note } = await searchParams;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: {
      vendor: true,
      requestedBy: true,
      lineItems: { orderBy: { sortOrder: "asc" }, include: { job: { include: { customer: true, property: true } } } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!po) notFound();

  const total = poTotalCents(po.lineItems);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        <Link href="/purchase-orders" className="hover:text-zinc-600">
          Purchase orders
        </Link>
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-900">Purchase order #{po.number}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PO_STATUS_STYLES[po.status]}`}>
            {PO_STATUS_LABELS[po.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/purchase-orders/${po.id}/pdf`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Download PDF
          </a>
          <PoStatusSelect poId={po.id} status={po.status} />
        </div>
      </div>

      <PoActions poId={po.id} status={po.status} hasVendorEmail={!!po.vendor.email} initialNote={note ?? null} />

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Vendor</p>
          <p className="mt-1 font-medium text-zinc-900">{po.vendor.name}</p>
          {po.vendor.contactName && <p className="text-sm text-zinc-500">{po.vendor.contactName}</p>}
          {po.vendor.phone && <p className="text-sm text-zinc-500">{po.vendor.phone}</p>}
          {po.vendor.email && <p className="text-sm text-zinc-500">{po.vendor.email}</p>}
          {formatVendorAddress(po.vendor) && <p className="text-sm text-zinc-500">{formatVendorAddress(po.vendor)}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Order</p>
          <p className="mt-1 text-sm text-zinc-700">Ordered {fmt(po.orderDate)}</p>
          <p className="text-sm text-zinc-700">Requested by {po.requestedBy?.name || po.requestedBy?.email || "—"}</p>
          {po.sentAt && <p className="text-sm text-zinc-700">Sent {fmt(po.sentAt)}</p>}
          {po.receivedAt && <p className="text-sm text-zinc-700">Received {fmt(po.receivedAt)}</p>}
          {po.vendor.paymentTerms && <p className="text-sm text-zinc-700">Terms: {po.vendor.paymentTerms}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            {po.fulfillment === "PICKUP" ? "Pickup" : "Delivery"}
          </p>
          <p className="mt-1 text-sm text-zinc-700">Est. {fmt(po.expectedDate)}</p>
          {po.fulfillment === "DELIVERY" && po.deliveryAddressLine1 && (
            <p className="text-sm text-zinc-700">
              {po.deliveryAddressLine1}
              <br />
              {[po.deliveryCity, [po.deliveryState, po.deliveryZip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3">For job</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {po.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-4 py-3 text-zinc-900">{li.name}</td>
                <td className="px-4 py-3 text-right text-zinc-600">{formatCents(li.costCents)}</td>
                <td className="px-4 py-3 text-right text-zinc-600">{li.quantity}</td>
                <td className="px-4 py-3">
                  {li.job ? (
                    <Link href={`/jobs/${li.job.id}`} className="text-brand hover:underline">
                      {li.job.customer.firstName} {li.job.customer.lastName}
                    </Link>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCents(li.costCents * li.quantity)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200">
              <td colSpan={4} className="px-4 py-3 text-right font-semibold text-zinc-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-base font-bold text-zinc-900">{formatCents(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {po.notes && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
          <p className="whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      {po.attachments.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Attachments</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {po.attachments.map((a) => (
              <li key={a.id}>
                <a href={a.dataUrl} download={a.filename} className="text-brand hover:underline">
                  📎 {a.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
