"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { ConversationPanel, type ConversationMessage } from "@/components/conversation-panel";
import {
  addLineItem,
  addLineItemFromPriceBook,
  removeLineItem,
  updateEstimateHeader,
  addPaymentScheduleItem,
  removePaymentScheduleItem,
  markAsWon,
  sendEstimate,
  deleteEstimate,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  EXPIRED: "Archived",
};

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  costCents: number | null;
}

interface PaymentScheduleItem {
  id: string;
  label: string;
  amountCents: number;
  dueDate: string | null;
}

interface EstimateData {
  id: string;
  number: number;
  status: string;
  notes: string | null;
  discountCents: number;
  depositCents: number;
  laborCostCents: number;
  sentAt: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  property: { addressLine1: string; city: string; state: string; zip: string } | null;
  lineItems: LineItem[];
  paymentSchedule: PaymentScheduleItem[];
  hasInvoice: boolean;
  invoiceId: string | null;
  communications: ConversationMessage[];
}

interface PriceBookItem {
  id: string;
  name: string;
  unitPriceCents: number;
}

export function EstimateEditor({
  estimate,
  priceBookItems,
}: {
  estimate: EstimateData;
  priceBookItems: PriceBookItem[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showPriceBook, setShowPriceBook] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const subtotalCents = estimate.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPriceCents,
    0,
  );
  const itemCostCents = estimate.lineItems.reduce((sum, li) => sum + (li.costCents ?? 0), 0);
  const totalCents = Math.max(0, subtotalCents - estimate.discountCents);
  const depositPercent = subtotalCents > 0 ? (estimate.depositCents / subtotalCents) * 100 : 0;
  const estMarginCents = totalCents - itemCostCents - estimate.laborCostCents;

  function handleRemoveItem(lineItemId: string) {
    startTransition(() => removeLineItem(estimate.id, lineItemId));
  }

  function handleAddFromPriceBook(priceBookItemId: string) {
    startTransition(async () => {
      await addLineItemFromPriceBook(estimate.id, priceBookItemId);
      setShowPriceBook(false);
    });
  }

  function handleStatusChange(status: string) {
    const fd = new FormData();
    fd.set("status", status);
    fd.set("notes", estimate.notes || "");
    fd.set("discount", (estimate.discountCents / 100).toString());
    fd.set("deposit", (estimate.depositCents / 100).toString());
    fd.set("laborCost", (estimate.laborCostCents / 100).toString());
    startTransition(() => updateEstimateHeader(estimate.id, fd));
  }

  function handleMarkAsWon() {
    if (estimate.lineItems.length === 0) {
      setNotice("Add at least one item before marking this estimate as won.");
      return;
    }
    startTransition(() => markAsWon(estimate.id));
  }

  function handleSend() {
    if (!estimate.customer.email) {
      setNotice("This customer has no email address on file — add one on the customer record first.");
      return;
    }
    startTransition(async () => {
      const res = await sendEstimate(estimate.id);
      if (res.error) setNotice(res.error);
      else if (res.skipped)
        setNotice("Estimate marked as sent, but no email went out — Mailgun isn't configured for this account yet.");
      else setNotice("Estimate emailed to the customer.");
    });
  }

  function handleDelete() {
    if (!confirm("Delete this estimate? This can't be undone.")) return;
    startTransition(() => deleteEstimate(estimate.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Estimate #{estimate.number}</h1>
        <div className="flex items-center gap-2">
          {estimate.hasInvoice && estimate.invoiceId && (
            <a
              href={`/invoices/${estimate.invoiceId}`}
              className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-brand/20"
            >
              View invoice →
            </a>
          )}
          {!estimate.hasInvoice && (
            <button
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-4">

      {/* Header card */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Client details</p>
          <a href={`/customers/${estimate.customer.id}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
            {estimate.customer.name}
          </a>
          {estimate.customer.email && <p className="text-sm text-zinc-500">{estimate.customer.email}</p>}
          {estimate.customer.phone && (
            <a href={`tel:${estimate.customer.phone}`} className="text-sm text-zinc-500 hover:text-brand">
              {estimate.customer.phone}
            </a>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
          {estimate.property ? (
            <p className="mt-1 text-sm text-zinc-700">
              {estimate.property.addressLine1}
              <br />
              {estimate.property.city}, {estimate.property.state} {estimate.property.zip}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">No property on file</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Status</p>
          <select
            defaultValue={estimate.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm font-medium text-zinc-900 outline-none focus:border-brand"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-400">Estimate no. {estimate.number}</p>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Items</h2>

        {estimate.lineItems.length === 0 ? (
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
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {estimate.lineItems.map((li) => (
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
                    <td className="py-2.5 text-right">
                      <button
                        disabled={isPending}
                        onClick={() => handleRemoveItem(li.id)}
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
          <button
            disabled={isPending || estimate.hasInvoice}
            onClick={handleMarkAsWon}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {estimate.hasInvoice ? "Already converted" : "Mark as won"}
          </button>
        </div>
      </div>

      {/* Totals + Payment schedule */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Totals</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <Row label="Subtotal" value={formatCents(subtotalCents)} />
            <EditableRow
              label="Discount"
              initialCents={estimate.discountCents}
              onSave={(cents) => saveField(estimate, "discount", cents, startTransition)}
            />
            <Row label="Item cost" value={formatCents(itemCostCents)} muted />
            <EditableRow
              label="Labor cost"
              initialCents={estimate.laborCostCents}
              onSave={(cents) => saveField(estimate, "laborCost", cents, startTransition)}
            />
            <EditableRow
              label="Deposit"
              initialCents={estimate.depositCents}
              suffix={`(${depositPercent.toFixed(1)}%)`}
              onSave={(cents) => saveField(estimate, "deposit", cents, startTransition)}
            />
            <div className="mt-2 flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
              <dt>Total</dt>
              <dd>{formatCents(totalCents)}</dd>
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
              onClick={() => setShowPaymentForm((v) => !v)}
              className="text-xs font-medium text-brand hover:underline"
            >
              + Add
            </button>
          </div>
          {estimate.paymentSchedule.length === 0 ? (
            <p className="text-sm text-zinc-400">No payment schedule set.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {estimate.paymentSchedule.map((p) => (
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
                      onClick={() =>
                        startTransition(() => removePaymentScheduleItem(estimate.id, p.id))
                      }
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
                  await addPaymentScheduleItem(estimate.id, fd);
                  setShowPaymentForm(false);
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

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Description</h2>
        <NotesField estimate={estimate} onSave={() => {}} />
      </div>

      </div>

      <ConversationPanel customerName={estimate.customer.name} messages={estimate.communications} />

      </div>

      {/* Add item modal */}
      {showAddItem && (
        <Modal onClose={() => setShowAddItem(false)} title="Add estimate item">
          <form
            action={(fd) =>
              startTransition(async () => {
                await addLineItem(estimate.id, fd);
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
                    onClick={() => handleAddFromPriceBook(p.id)}
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

function saveField(
  estimate: EstimateData,
  field: "discount" | "deposit" | "laborCost",
  cents: number,
  startTransition: (cb: () => void) => void,
) {
  const fd = new FormData();
  fd.set("status", estimate.status);
  fd.set("notes", estimate.notes || "");
  fd.set("discount", (field === "discount" ? cents : estimate.discountCents) / 100 + "");
  fd.set("deposit", (field === "deposit" ? cents : estimate.depositCents) / 100 + "");
  fd.set("laborCost", (field === "laborCost" ? cents : estimate.laborCostCents) / 100 + "");
  startTransition(() => updateEstimateHeader(estimate.id, fd));
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

function NotesField({ estimate }: { estimate: EstimateData; onSave: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(estimate.notes || "");

  return (
    <textarea
      defaultValue={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const fd = new FormData();
        fd.set("status", estimate.status);
        fd.set("notes", value);
        fd.set("discount", (estimate.discountCents / 100).toString());
        fd.set("deposit", (estimate.depositCents / 100).toString());
        fd.set("laborCost", (estimate.laborCostCents / 100).toString());
        startTransition(() => updateEstimateHeader(estimate.id, fd));
      }}
      disabled={isPending}
      rows={3}
      placeholder="Add a description or internal notes for this estimate…"
      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
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
