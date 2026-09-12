"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import {
  addLineItem,
  addLineItemFromPriceBook,
  removeLineItem,
  setLineItemTaxable,
  updateInvoiceHeader,
  addPaymentScheduleItem,
  removePaymentScheduleItem,
  addPayment,
  removePayment,
  voidInvoice,
  deleteInvoice,
  sendInvoice,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  VOID: "Void",
};

const PAYMENT_METHODS = ["CARD", "CASH", "CHECK", "ACH", "OTHER"] as const;

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  costCents: number | null;
  taxable: boolean;
}

interface PaymentScheduleItem {
  id: string;
  label: string;
  amountCents: number;
  dueDate: string | null;
}

interface PaymentRow {
  id: string;
  amountCents: number;
  method: string;
  reference: string | null;
  createdAt: string;
}

interface InvoiceData {
  id: string;
  number: number;
  name: string | null;
  status: string;
  notes: string | null;
  invoiceDate: string;
  dueAt: string | null;
  sentAt: string | null;
  discountCents: number;
  depositCents: number;
  tipCents: number;
  laborCostCents: number;
  taxRateId: string | null;
  publicToken: string;
  customer: { id: string; name: string; companyName: string | null; email: string | null; phone: string | null };
  property: { addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string } | null;
  lineItems: LineItem[];
  paymentSchedule: PaymentScheduleItem[];
  payments: PaymentRow[];
  signature: { signerName: string; imageDataUrl: string; signedAt: string } | null;
  attachments: { id: string; filename: string; mimeType: string; sizeBytes: number }[];
}

interface TaxRate {
  id: string;
  name: string;
  rateBps: number;
}

interface PriceBookItem {
  id: string;
  name: string;
  unitPriceCents: number;
  costCents: number | null;
}

export function InvoiceEditor({
  invoice,
  taxRates,
  priceBookItems,
}: {
  invoice: InvoiceData;
  taxRates: TaxRate[];
  priceBookItems: PriceBookItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPriceBook, setShowPriceBook] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentSchedule, setShowPaymentSchedule] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeTaxRate = taxRates.find((t) => t.id === invoice.taxRateId) ?? null;
  const totals = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountCents: invoice.discountCents,
    tipCents: invoice.tipCents,
    taxRateBps: activeTaxRate?.rateBps ?? 0,
    payments: invoice.payments,
  });
  const estMarginCents = totals.totalCents - totals.itemCostCents - invoice.laborCostCents - totals.taxCents;

  function buildHeaderForm(overrides: Record<string, string>) {
    const fd = new FormData();
    fd.set("status", invoice.status);
    fd.set("name", invoice.name || "");
    fd.set("notes", invoice.notes || "");
    fd.set("invoiceDate", invoice.invoiceDate.slice(0, 10));
    fd.set("dueAt", invoice.dueAt ? invoice.dueAt.slice(0, 10) : "");
    fd.set("taxRateId", invoice.taxRateId || "");
    fd.set("discount", (invoice.discountCents / 100).toString());
    fd.set("deposit", (invoice.depositCents / 100).toString());
    fd.set("tip", (invoice.tipCents / 100).toString());
    fd.set("laborCost", (invoice.laborCostCents / 100).toString());
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
    return fd;
  }

  function saveHeader(overrides: Record<string, string>) {
    startTransition(() => updateInvoiceHeader(invoice.id, buildHeaderForm(overrides)));
  }

  function handleSend() {
    if (!invoice.customer.email) {
      setNotice("This customer has no email address on file — add one on the customer record first.");
      return;
    }
    startTransition(async () => {
      const res = await sendInvoice(invoice.id);
      if (res.error) setNotice(res.error);
      else if (res.skipped)
        setNotice(
          "Invoice marked as sent, but no email went out — Mailgun isn't configured yet. Real delivery lands in the next update.",
        );
      else setNotice("Invoice emailed to the customer.");
    });
  }

  function handleDelete() {
    if (!confirm(`Delete invoice #${invoice.number}? This can't be undone.`)) return;
    startTransition(() => deleteInvoice(invoice.id));
  }

  function handleVoid() {
    if (!confirm(`Void invoice #${invoice.number}? It will no longer count toward totals.`)) return;
    startTransition(() => voidInvoice(invoice.id));
  }

  const clientUrl =
    typeof window !== "undefined" ? `${window.location.origin}/i/${invoice.publicToken}` : "";

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Invoice #{invoice.number}</h1>
          <InlineText
            value={invoice.name || ""}
            placeholder="Add an invoice name…"
            onSave={(v) => saveHeader({ name: v })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600">
            {STATUS_LABELS[invoice.status] || invoice.status}
          </span>
          {invoice.status !== "VOID" && (
            <button
              disabled={isPending}
              onClick={handleVoid}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Void
            </button>
          )}
          <button
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            disabled={isPending}
            onClick={handleSend}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Send
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold">
            ✕
          </button>
        </div>
      )}

      {/* Header card */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Bill to</p>
          <a href={`/customers/${invoice.customer.id}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
            {invoice.customer.name}
          </a>
          {invoice.customer.companyName && (
            <p className="text-sm text-zinc-500">{invoice.customer.companyName}</p>
          )}
          {invoice.customer.email && <p className="text-sm text-zinc-500">{invoice.customer.email}</p>}
          {invoice.customer.phone && <p className="text-sm text-zinc-500">{invoice.customer.phone}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
          {invoice.property ? (
            <p className="mt-1 text-sm text-zinc-700">
              {invoice.property.addressLine1}
              {invoice.property.addressLine2 ? `, ${invoice.property.addressLine2}` : ""}
              <br />
              {invoice.property.city}, {invoice.property.state} {invoice.property.zip}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">No property on file</p>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">Invoice ID</span>
            <span className="font-medium text-zinc-900">{invoice.number}</span>
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Invoice date</span>
            <input
              type="date"
              defaultValue={invoice.invoiceDate.slice(0, 10)}
              onChange={(e) => saveHeader({ invoiceDate: e.target.value })}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Due date</span>
            <input
              type="date"
              defaultValue={invoice.dueAt ? invoice.dueAt.slice(0, 10) : ""}
              onChange={(e) => saveHeader({ dueAt: e.target.value })}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-brand"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-zinc-400">Status</span>
            <select
              defaultValue={invoice.status}
              disabled={isPending}
              onChange={(e) => saveHeader({ status: e.target.value })}
              className="rounded-lg border border-zinc-300 px-2 py-1 text-sm font-medium text-zinc-900 outline-none focus:border-brand"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-between">
            <span className="text-zinc-400">Sent</span>
            <span className={invoice.sentAt ? "font-medium text-emerald-600" : "font-medium text-red-500"}>
              {invoice.sentAt
                ? new Date(invoice.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Items</h2>

        {invoice.lineItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <span className="text-2xl">🧾</span>
            <p className="text-sm text-zinc-400">Add items</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Cost</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-center">Taxable</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoice.lineItems.map((li) => (
                  <tr key={li.id}>
                    <td className="py-2.5 text-zinc-900">{li.description}</td>
                    <td className="py-2.5 text-right text-zinc-900">{li.quantity}</td>
                    <td className="py-2.5 text-right text-zinc-900">{formatCents(li.unitPriceCents)}</td>
                    <td className="py-2.5 text-right text-zinc-400">
                      {li.costCents != null ? formatCents(li.costCents) : "—"}
                    </td>
                    <td className="py-2.5 text-right font-medium text-zinc-900">
                      {formatCents(li.quantity * li.unitPriceCents)}
                    </td>
                    <td className="py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={li.taxable}
                        disabled={isPending}
                        onChange={(e) =>
                          startTransition(() => setLineItemTaxable(invoice.id, li.id, e.target.checked))
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        disabled={isPending}
                        onClick={() => startTransition(() => removeLineItem(invoice.id, li.id))}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddItem(true)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Add item
          </button>
          <button
            onClick={() => setShowPriceBook(true)}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Price book
          </button>
        </div>
      </div>

      {/* Totals + Payment schedule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Totals</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatCents(totals.subtotalCents)} />
            <EditableRow
              label="Discount"
              initialCents={invoice.discountCents}
              onSave={(cents) => saveHeader({ discount: (cents / 100).toString() })}
            />
            <EditableRow
              label="Tip"
              initialCents={invoice.tipCents}
              onSave={(cents) => saveHeader({ tip: (cents / 100).toString() })}
            />
            <div className="flex items-center justify-between">
              <dt className="text-zinc-500">Tax rate</dt>
              <dd>
                <select
                  defaultValue={invoice.taxRateId || ""}
                  disabled={isPending}
                  onChange={(e) => saveHeader({ taxRateId: e.target.value })}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-brand"
                >
                  <option value="">None</option>
                  {taxRates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({(t.rateBps / 100).toFixed(2)}%)
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            <Row label="Taxable base" value={formatCents(totals.taxableBaseCents)} muted />
            <Row label="Tax" value={formatCents(totals.taxCents)} />
            <Row label="Item cost" value={formatCents(totals.itemCostCents)} muted />
            <EditableRow
              label="Labor cost"
              initialCents={invoice.laborCostCents}
              onSave={(cents) => saveHeader({ laborCost: (cents / 100).toString() })}
            />
            <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
              <dt>Total</dt>
              <dd>{formatCents(totals.totalCents)}</dd>
            </div>
            <div className="flex justify-between text-emerald-600">
              <dt>Paid</dt>
              <dd>{formatCents(totals.paidCents)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold text-zinc-900">
              <dt>Balance</dt>
              <dd>{formatCents(totals.balanceCents)}</dd>
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <dt>Est. margin (internal)</dt>
              <dd>{formatCents(estMarginCents)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Payment schedule</h2>
            <button
              onClick={() => setShowPaymentSchedule((v) => !v)}
              className="text-xs font-medium text-brand hover:underline"
            >
              + Add
            </button>
          </div>
          {invoice.paymentSchedule.length === 0 ? (
            <p className="text-sm text-zinc-400">No payment schedule set.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {invoice.paymentSchedule.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span>
                    {p.label}
                    {p.dueDate && (
                      <span className="ml-2 text-xs text-zinc-400">
                        due {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{formatCents(p.amountCents)}</span>
                    <button
                      onClick={() => startTransition(() => removePaymentScheduleItem(invoice.id, p.id))}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {showPaymentSchedule && (
            <form
              action={(fd) =>
                startTransition(async () => {
                  await addPaymentScheduleItem(invoice.id, fd);
                  setShowPaymentSchedule(false);
                })
              }
              className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-4"
            >
              <input
                name="label"
                required
                placeholder="e.g. Deposit, On completion"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <div className="flex gap-2">
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  placeholder="Amount"
                  className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
                <input
                  name="dueDate"
                  type="date"
                  className="w-1/2 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                className="self-start rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Save
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Payments</h2>
          <button
            onClick={() => setShowPaymentForm((v) => !v)}
            className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Add payment
          </button>
        </div>

        {invoice.payments.length === 0 ? (
          <p className="text-sm text-zinc-400">No payments recorded.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {invoice.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-zinc-900">{formatCents(p.amountCents)}</span>
                  <span className="ml-2 text-zinc-500">{p.method}</span>
                  {p.reference && <span className="ml-2 text-xs text-zinc-400">ref {p.reference}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <button
                    onClick={() => startTransition(() => removePayment(invoice.id, p.id))}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {showPaymentForm && (
          <form
            action={(fd) =>
              startTransition(async () => {
                await addPayment(invoice.id, fd);
                setShowPaymentForm(false);
              })
            }
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-4"
          >
            <div>
              <label className="text-xs font-medium text-zinc-500">Amount</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={(totals.balanceCents / 100).toFixed(2)}
                className="mt-1 w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Method</label>
              <select
                name="method"
                className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Reference</label>
              <input
                name="reference"
                placeholder="Optional"
                className="mt-1 w-40 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Record
            </button>
          </form>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Notes</h2>
        <NotesField invoice={invoice} onSave={(v) => saveHeader({ notes: v })} />
      </div>

      {/* Client link */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Client link</h2>
        <p className="text-zinc-500">
          Share this read-only link with the customer:{" "}
          <a href={`/i/${invoice.publicToken}`} target="_blank" className="font-medium text-brand hover:underline">
            {clientUrl || `/i/${invoice.publicToken}`}
          </a>
        </p>
      </div>

      {/* Add item modal */}
      {showAddItem && (
        <Modal onClose={() => setShowAddItem(false)} title="Add invoice item">
          <form
            action={(fd) =>
              startTransition(async () => {
                await addLineItem(invoice.id, fd);
                setShowAddItem(false);
              })
            }
            className="flex flex-col gap-3"
          >
            <input
              name="description"
              required
              placeholder="Item name"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-zinc-500">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  defaultValue={1}
                  min={1}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Price</label>
                <input
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  defaultValue="0"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Cost</label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" name="taxable" className="h-4 w-4 rounded border-zinc-300" />
              Taxable
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" name="saveToPriceBook" className="h-4 w-4 rounded border-zinc-300" />
              Save as a reusable item in the Price Book
            </label>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Price book modal */}
      {showPriceBook && (
        <Modal onClose={() => setShowPriceBook(false)} title="Price book">
          {priceBookItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-2xl">📖</span>
              <p className="text-sm font-medium text-zinc-900">Price book is empty</p>
              <p className="text-xs text-zinc-400">Add items to your Price Book to use them here.</p>
            </div>
          ) : (
            <ul className="flex max-h-80 flex-col divide-y divide-zinc-100 overflow-y-auto">
              {priceBookItems.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await addLineItemFromPriceBook(invoice.id, p.id);
                        setShowPriceBook(false);
                      })
                    }
                    className="flex w-full items-center justify-between px-2 py-3 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="text-zinc-900">{p.name}</span>
                    <span className="font-medium text-zinc-900">{formatCents(p.unitPriceCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={muted ? "text-zinc-400" : "text-zinc-500"}>{label}</dt>
      <dd className={muted ? "text-zinc-400" : "font-medium text-zinc-900"}>{value}</dd>
    </div>
  );
}

function EditableRow({
  label,
  initialCents,
  suffix,
  onSave,
}: {
  label: string;
  initialCents: number;
  suffix?: string;
  onSave: (cents: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((initialCents / 100).toFixed(2));

  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500">{label}</dt>
        <dd className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              onSave(Math.round(parseFloat(value || "0") * 100));
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-right text-sm outline-none focus:border-brand"
          />
        </dd>
      </div>
    );
  }

  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd>
        <button onClick={() => setEditing(true)} className="font-medium text-zinc-900 hover:text-brand">
          {formatCents(initialCents)} {suffix && <span className="text-xs text-zinc-400">{suffix}</span>}
        </button>
      </dd>
    </div>
  );
}

function NotesField({ invoice, onSave }: { invoice: InvoiceData; onSave: (value: string) => void }) {
  const [value, setValue] = useState(invoice.notes || "");

  return (
    <textarea
      defaultValue={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSave(value)}
      rows={3}
      placeholder="Add notes for this invoice…"
      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
    />
  );
}

function InlineText({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      defaultValue={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== value) onSave(text);
      }}
      placeholder={placeholder}
      className="mt-0.5 w-64 rounded-lg border border-transparent px-1 py-0.5 text-sm text-zinc-500 outline-none hover:border-zinc-300 focus:border-brand"
    />
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
