"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { deleteEstimates, updateEstimatesStatus } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  WON: "Won",
  EXPIRED: "Archived",
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENT: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  DECLINED: "bg-red-100 text-red-700",
  WON: "bg-brand/10 text-brand-dark",
  EXPIRED: "bg-zinc-100 text-zinc-500",
};

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_ADS: "Google Ads",
  REFERRAL: "Referral",
  YELP: "Yelp",
  DOOR_HANGER: "Door Hanger",
  WEBSITE: "Website",
  REPEAT: "Repeat Customer",
  OTHER: "Other",
};

export interface EstimateRow {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  companyName: string | null;
  source: string;
  createdAt: string;
  amountCents: number;
  displayStatus: string;
}

export function EstimatesTable({ estimates }: { estimates: EstimateRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [reminderNotice, setReminderNotice] = useState(false);

  const allSelected = estimates.length > 0 && selected.size === estimates.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(estimates.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${selected.size} estimate(s)? This can't be undone.`)) return;
    startTransition(async () => {
      await deleteEstimates([...selected]);
      setSelected(new Set());
    });
  }

  function handleStatusChange(status: string) {
    if (!status) return;
    startTransition(async () => {
      await updateEstimatesStatus([...selected], status);
      setSelected(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">
            {selected.size} estimate{selected.size === 1 ? "" : "s"} selected
          </span>
          <select
            disabled={isPending}
            defaultValue=""
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-700 outline-none focus:border-brand"
          >
            <option value="" disabled>
              Change status…
            </option>
            {(["DRAFT", "SENT", "APPROVED", "DECLINED", "EXPIRED"] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            disabled={isPending}
            onClick={() => setReminderNotice(true)}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            Send reminder
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

      {reminderNotice && (
        <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Email/SMS sending isn&apos;t set up yet (Mailgun/Twilio aren&apos;t wired in), so reminders
          can&apos;t actually send right now — this is a placeholder until that&apos;s built.
          <button onClick={() => setReminderNotice(false)} className="ml-3 font-semibold">
            ✕
          </button>
        </div>
      )}

      {/* Mobile: cards */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {estimates.map((e) => (
          <li key={e.id} className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(e.id)}
                onChange={() => toggleOne(e.id)}
                className="mt-1 h-4 w-4 rounded border-zinc-300"
              />
              <Link href={`/estimates/${e.id}`} className="flex-1">
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-zinc-900">
                    #{e.number} — {e.customerName}
                  </span>
                  <StatusBadge status={e.displayStatus} />
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {formatCents(e.amountCents)} ·{" "}
                  {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
              <th className="px-4 py-3">Estimate</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {estimates.map((e) => (
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
                  <Link href={`/estimates/${e.id}`} className="font-medium text-zinc-900 hover:text-brand">
                    #{e.number}
                  </Link>
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
                <td className="px-4 py-3 font-medium text-zinc-900">{formatCents(e.amountCents)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.displayStatus} />
                </td>
                <td className="px-4 py-3 text-zinc-500">{SOURCE_LABELS[e.source] || e.source}</td>
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
