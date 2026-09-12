"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { deleteInvoices, markInvoicesSent, sendInvoices } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Sent",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  VOID: "Void",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENT: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  PAID: "bg-emerald-100 text-emerald-700",
  VOID: "bg-zinc-100 text-zinc-500",
};

export interface InvoiceRow {
  id: string;
  number: number;
  name: string | null;
  customerId: string;
  customerName: string;
  companyName: string | null;
  createdAt: string;
  dueAt: string | null;
  sent: boolean;
  status: string;
  jobName: string | null;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  balanceCents: number;
}

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const allSelected = invoices.length > 0 && selected.size === invoices.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(invoices.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMarkSent() {
    startTransition(async () => {
      await markInvoicesSent([...selected]);
      setSelected(new Set());
    });
  }

  function handleSend(reminder: boolean) {
    startTransition(async () => {
      const res = await sendInvoices([...selected]);
      setSelected(new Set());
      setNotice(
        res.skipped > 0
          ? `${res.sent} ${reminder ? "reminder" : "invoice"}(s) marked sent. ${res.skipped} could not email — Mailgun isn't configured yet.`
          : `${res.sent} ${reminder ? "reminder" : "invoice"}(s) sent.`,
      );
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${selected.size} invoice(s)? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteInvoices([...selected]);
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">
            {selected.size} invoice{selected.size === 1 ? "" : "s"} selected
          </span>
          <button
            disabled={isPending}
            onClick={() => handleSend(false)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Send invoice
          </button>
          <button
            disabled={isPending}
            onClick={() => handleSend(true)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Send reminder
          </button>
          <button
            disabled={isPending}
            onClick={handleMarkSent}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Mark sent
          </button>
          <button
            disabled={isPending}
            onClick={handleDelete}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Delete
          </button>
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
          <button onClick={() => setNotice(null)} className="ml-3 font-semibold">
            ✕
          </button>
        </div>
      )}

      {/* Mobile: cards */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {invoices.map((e) => (
          <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggleOne(e.id)}
                className="mt-1 h-4 w-4 rounded border-zinc-300"
              />
              <Link href={`/invoices/${e.id}`} className="flex-1">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-zinc-900">
                    #{e.number} — {e.customerName}
                  </span>
                  <StatusBadge status={e.status} />
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatCents(e.totalCents)} · balance {formatCents(e.balanceCents)}
                </p>
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-300"
                />
              </th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
              <th className="px-4 py-3 text-right">Tax</th>
              <th className="px-4 py-3 text-right">Discount</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Job</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {invoices.map((e) => (
              <tr key={e.id} className={`hover:bg-zinc-50 ${selected.has(e.id) ? "bg-brand/5" : ""}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleOne(e.id)}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/invoices/${e.id}`} className="font-medium text-zinc-900 hover:text-brand">
                    #{e.number}
                  </Link>
                  {e.name && <p className="text-xs text-zinc-400">{e.name}</p>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/customers/${e.customerId}`} className="text-zinc-700 hover:text-brand">
                    {e.customerName}
                  </Link>
                  {e.companyName && <p className="text-xs text-zinc-400">{e.companyName}</p>}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(e.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 text-right text-zinc-700">{formatCents(e.subtotalCents)}</td>
                <td className="px-4 py-3 text-right text-zinc-700">{formatCents(e.taxCents)}</td>
                <td className="px-4 py-3 text-right text-zinc-700">{formatCents(e.discountCents)}</td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatCents(e.totalCents)}</td>
                <td className="px-4 py-3 text-right text-zinc-700">{formatCents(e.balanceCents)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                  {!e.sent && e.status !== "VOID" && (
                    <p className="mt-0.5 text-xs text-zinc-400">Not sent</p>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{e.jobName || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
        STATUS_BADGE[status] || "bg-zinc-100 text-zinc-600"
      }`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
