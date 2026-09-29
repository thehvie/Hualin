import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCents, lineItemsTotal } from "@/lib/money";
import { formatQty } from "@/lib/price-book";
import { SignForm } from "./sign-form";

export const metadata = { title: "Estimate", robots: { index: false, follow: false } };

export default async function PublicEstimatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { publicToken: token },
    include: {
      company: true,
      customer: true,
      property: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      paymentSchedule: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!estimate) notFound();

  const { company } = estimate;
  const subtotal = lineItemsTotal(estimate.lineItems);
  const discount = Math.min(Math.max(estimate.discountCents, 0), subtotal);
  const total = Math.max(0, subtotal - discount);
  const open = estimate.status === "DRAFT" || estimate.status === "SENT";

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <div className="flex items-center gap-3">
          {company.logoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoDataUrl} alt={company.name} className="h-10 max-w-[140px] object-contain" />
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-900">{company.name}</h1>
            <p className="text-sm text-zinc-500">
              Estimate #{estimate.number} for {estimate.customer.firstName} {estimate.customer.lastName}
            </p>
          </div>
          <a
            href={`/e/${token}/pdf`}
            className="shrink-0 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-white"
          >
            Download PDF
          </a>
        </div>

        {estimate.status === "APPROVED" && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Thank you{estimate.signedName ? `, ${estimate.signedName}` : ""}! This estimate was approved
            {estimate.signedAt
              ? ` on ${estimate.signedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`
              : ""}
            . We&apos;ll be in touch to schedule your job.
          </div>
        )}
        {estimate.status === "DECLINED" && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
            This estimate was declined. Contact {company.name}
            {company.phone ? ` at ${company.phone}` : ""} if that was a mistake.
          </div>
        )}
        {estimate.status === "EXPIRED" && (
          <div className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
            This estimate has expired. Please contact {company.name} for an updated one.
          </div>
        )}

        {estimate.property && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
            <p className="mt-1">
              {estimate.property.addressLine1}
              {estimate.property.addressLine2 ? `, ${estimate.property.addressLine2}` : ""}
              <br />
              {estimate.property.city}, {estimate.property.state} {estimate.property.zip}
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
              {estimate.lineItems.map((li) => (
                <tr key={li.id}>
                  <td className="px-4 py-2.5 text-zinc-900">
                    {li.description}
                    {li.isRental && (
                      <span className="block text-xs text-zinc-400">{formatCents(li.unitPriceCents)} per day</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right text-zinc-500">{formatQty(li.quantity, li.isRental)}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-900">
                    {formatCents(li.quantity * li.unitPriceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="flex flex-col gap-1.5 border-t border-zinc-200 px-4 py-3 text-sm">
            <div className="flex justify-between text-zinc-500">
              <dt>Subtotal</dt>
              <dd>{formatCents(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Discount</dt>
                <dd>-{formatCents(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-zinc-900">
              <dt>Total</dt>
              <dd>{formatCents(total)}</dd>
            </div>
            {estimate.depositCents > 0 && (
              <div className="flex justify-between text-zinc-500">
                <dt>Deposit due</dt>
                <dd>{formatCents(estimate.depositCents)}</dd>
              </div>
            )}
          </dl>
        </div>

        {estimate.paymentSchedule.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Payment schedule</p>
            <ul className="flex flex-col gap-1.5">
              {estimate.paymentSchedule.map((p) => (
                <li key={p.id} className="flex justify-between text-zinc-700">
                  <span>
                    {p.label}
                    {p.dueDate ? ` — ${p.dueDate.toLocaleDateString("en-US", { dateStyle: "medium" })}` : ""}
                  </span>
                  <span>{formatCents(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {estimate.notes && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
            <p className="whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {company.termsText && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-xs text-zinc-500">
            <p className="mb-1 font-semibold uppercase tracking-wide text-zinc-400">Terms &amp; conditions</p>
            <p className="whitespace-pre-wrap">{company.termsText}</p>
          </div>
        )}

        {open && <SignForm token={token} />}

        {estimate.status === "APPROVED" && estimate.signatureDataUrl && (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Signature</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={estimate.signatureDataUrl} alt="Signature" className="h-20 object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}
