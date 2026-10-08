import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import { formatQty } from "@/lib/price-book";
import { computeInvoiceTotals } from "@/lib/invoice-totals";

export const metadata = { title: "Invoice", robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicToken: token },
    include: {
      company: true,
      customer: { include: { properties: true } },
      lineItems: { orderBy: { sortOrder: "asc" } },
      payments: true,
      taxRate: true,
    },
  });
  if (!invoice) notFound();

  const { company } = invoice;
  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    fuelSurchargeCents: invoice.fuelSurchargeCents,
    tipCents: invoice.tipCents,
    taxRateBps: invoice.taxRate?.rateBps ?? 0,
    payments: invoice.payments,
  });
  const property = invoice.customer.properties[0] ?? null;
  const paidInFull = totals.balanceCents <= 0 && totals.totalCents > 0;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {company.logoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoDataUrl} alt={company.name} className="h-10 max-w-[140px] object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold text-zinc-900">{company.name}</h1>
              <p className="text-sm text-zinc-500">
                Invoice #{invoice.number} for {invoice.customer.firstName} {invoice.customer.lastName}
              </p>
            </div>
          </div>
          <a
            href={`/i/${token}/pdf`}
            className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-white"
          >
            Download PDF
          </a>
        </div>

        {paidInFull ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Paid in full — thank you!
          </div>
        ) : invoice.status !== "VOID" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Balance due: <strong>{formatCents(Math.max(0, totals.balanceCents))}</strong>
            {company.phone ? ` — questions? Call ${company.phone}.` : ""}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-700">This invoice has been voided.</div>
        )}

        {property && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
            <p className="mt-1">
              {property.addressLine1}
              {property.addressLine2 ? `, ${property.addressLine2}` : ""}
              <br />
              {property.city}, {property.state} {property.zip}
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-2 py-2.5 text-right">Qty</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invoice.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="px-4 py-2.5 text-zinc-900">
                    {li.description}
                    {li.isRental && (
                      <span className="block text-xs text-zinc-400">{formatCents(li.unitPriceCents)} per day</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right text-zinc-500">{formatQty(li.quantity, li.isRental)}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-900">{formatCents(li.quantity * li.unitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="flex flex-col gap-1.5 border-t border-zinc-200 px-4 py-3 text-sm">
            <div className="flex justify-between text-zinc-500">
              <dt>Subtotal</dt>
              <dd>{formatCents(totals.subtotalCents)}</dd>
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Discount</dt>
                <dd>-{formatCents(totals.discountCents)}</dd>
              </div>
            )}
            {totals.fuelSurchargeCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Fuel surcharge</dt>
                <dd>{formatCents(totals.fuelSurchargeCents)}</dd>
              </div>
            )}
            {totals.taxCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Tax</dt>
                <dd>{formatCents(totals.taxCents)}</dd>
              </div>
            )}
            {totals.tipCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Tip</dt>
                <dd>{formatCents(totals.tipCents)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-zinc-900">
              <dt>Total</dt>
              <dd>{formatCents(totals.totalCents)}</dd>
            </div>
            {totals.paidCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Paid</dt>
                <dd>-{formatCents(totals.paidCents)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold text-zinc-900">
              <dt>Balance due</dt>
              <dd>{formatCents(Math.max(0, totals.balanceCents))}</dd>
            </div>
          </dl>
        </div>

        {invoice.notes && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {company.termsText && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-xs text-zinc-500">
            <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">Terms &amp; conditions</p>
            <p className="whitespace-pre-wrap">{company.termsText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
