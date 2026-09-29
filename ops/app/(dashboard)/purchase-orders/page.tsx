import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { formatCents } from "@/lib/money";
import { poTotalCents, formatVendorAddress } from "@/lib/purchase-orders";
import { NewPurchaseOrderButton } from "./po-wizard";
import { NewVendorButton } from "./vendor-form";
import { PoStatusSelect, VendorActiveToggle } from "./status-select";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "—";
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; vendors?: string }>;
}) {
  const { companyId } = await requireSession();
  const { tab, vendors: vendorFilter } = await searchParams;
  const activeTab = tab === "vendors" ? "vendors" : "orders";
  const showInactive = vendorFilter === "inactive";

  const [orders, vendors, priceBook, jobs] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: { vendor: true, requestedBy: true, lineItems: true },
    }),
    prisma.vendor.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.priceBookItem.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.job.findMany({
      where: { companyId, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { customer: true, property: true },
    }),
  ]);

  const activeVendors = vendors.filter((v) => v.active);
  const listedVendors = vendors.filter((v) => v.active !== showInactive);

  const tabClass = (t: string) =>
    `border-b-2 px-1 pb-3 text-sm font-semibold ${
      activeTab === t ? "border-brand text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
    }`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h1 className="text-2xl font-bold text-zinc-900">Purchase orders</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage and track your vendors and purchase orders for streamlined operations.</p>
      </div>

      <div className="flex gap-8 border-b border-zinc-200">
        <Link href="/purchase-orders" className={tabClass("orders")}>
          Orders ({orders.length})
        </Link>
        <Link href="/purchase-orders?tab=vendors" className={tabClass("vendors")}>
          Vendors ({activeVendors.length})
        </Link>
      </div>

      {activeTab === "orders" ? (
        <>
          <div className="flex justify-end">
            <NewPurchaseOrderButton
              vendors={activeVendors.map((v) => ({
                id: v.id,
                name: v.name,
                contactName: v.contactName,
                phone: v.phone,
                email: v.email,
              }))}
              catalog={priceBook.map((p) => ({ id: p.id, name: p.name, costCents: p.costCents ?? p.unitPriceCents }))}
              jobs={jobs.map((j) => ({
                id: j.id,
                label: `${j.customer.firstName} ${j.customer.lastName}${j.property ? ` — ${j.property.addressLine1}` : ""}`,
              }))}
            />
          </div>

          {orders.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center">
              <p className="text-2xl">📦</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">No purchase orders yet</p>
              <p className="text-sm text-zinc-400">Create one to order supplies from a vendor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">PO ID</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Ordered</th>
                    <th className="px-4 py-3">Requested by</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Est. delivery / pickup</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-4 py-3">
                        <Link href={`/purchase-orders/${o.id}`} className="font-semibold text-brand hover:underline">
                          {o.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{fmtDate(o.createdAt)}</td>
                      <td className="px-4 py-3 text-zinc-600">{fmtDate(o.orderDate)}</td>
                      <td className="px-4 py-3 text-zinc-600">{o.requestedBy?.name || o.requestedBy?.email || "—"}</td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{o.vendor.name}</td>
                      <td className="px-4 py-3 text-right text-zinc-900">{formatCents(poTotalCents(o.lineItems))}</td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-600">{fmtDate(o.expectedDate)}</span>
                        <span
                          className={`ml-2 text-xs font-semibold ${o.fulfillment === "PICKUP" ? "text-emerald-600" : "text-sky-600"}`}
                        >
                          {o.fulfillment === "PICKUP" ? "Pickup" : "Delivery"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <PoStatusSelect poId={o.id} status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-full border border-zinc-300 p-0.5 text-xs font-semibold">
              <Link
                href="/purchase-orders?tab=vendors"
                className={`rounded-full px-3 py-1 ${!showInactive ? "bg-brand text-white" : "text-zinc-600"}`}
              >
                Active
              </Link>
              <Link
                href="/purchase-orders?tab=vendors&vendors=inactive"
                className={`rounded-full px-3 py-1 ${showInactive ? "bg-brand text-white" : "text-zinc-600"}`}
              >
                Inactive
              </Link>
            </div>
            <NewVendorButton />
          </div>

          {listedVendors.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-400">
              {showInactive ? "No inactive vendors." : "No vendors yet — add your first supplier."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3">Vendor name</th>
                    <th className="px-4 py-3">Contact person</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Terms</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {listedVendors.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{v.name}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {v.contactName || "—"}
                        {v.contactTitle && <span className="text-zinc-400"> ({v.contactTitle})</span>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {v.phone ? (
                          <a href={`tel:${v.phone}`} className="text-brand hover:underline">
                            {v.phone}
                            {v.phoneExt ? ` x${v.phoneExt}` : ""}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{v.email || "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{formatVendorAddress(v) || "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{v.paymentTerms || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <VendorActiveToggle vendorId={v.id} active={v.active} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
