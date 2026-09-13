"use client";

import { useState, useTransition } from "react";
import { updateJob } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  UNSCHEDULED: "Unscheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface JobData {
  id: string;
  status: string;
  scheduledAt: string | null;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  property: { addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string } | null;
  estimateId: string | null;
  estimateNumber: number | null;
  invoiceId: string | null;
  invoiceNumber: number | null;
}

export function JobEditor({ job }: { job: JobData }) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function save(overrides: Record<string, string>) {
    const fd = new FormData();
    fd.set("status", job.status);
    fd.set("scheduledAt", toDatetimeLocal(job.scheduledAt));
    fd.set("notes", job.notes || "");
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
    startTransition(async () => {
      await updateJob(job.id, fd);
      setNotice("Saved.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Job — {job.customer.name}</h1>
        <select
          defaultValue={job.status}
          disabled={isPending}
          onChange={(e) => save({ status: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-brand"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Customer</p>
          <a href={`/customers/${job.customer.id}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
            {job.customer.name}
          </a>
          {job.customer.email && <p className="text-sm text-zinc-500">{job.customer.email}</p>}
          {job.customer.phone && <p className="text-sm text-zinc-500">{job.customer.phone}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
          {job.property ? (
            <p className="mt-1 text-sm text-zinc-700">
              {job.property.addressLine1}{job.property.addressLine2 ? `, ${job.property.addressLine2}` : ""}
              <br />
              {job.property.city}, {job.property.state} {job.property.zip}
            </p>
          ) : (
            <p className="mt-1 text-sm text-zinc-400">No property on file</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Scheduled for</p>
        <input
          type="datetime-local"
          defaultValue={toDatetimeLocal(job.scheduledAt)}
          disabled={isPending}
          onChange={(e) => save({ scheduledAt: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
        <textarea
          defaultValue={job.notes || ""}
          rows={4}
          disabled={isPending}
          onBlur={(e) => save({ notes: e.target.value })}
          placeholder="Job notes…"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
      </div>

      {(job.estimateId || job.invoiceId) && (
        <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm">
          {job.estimateId && (
            <a href={`/estimates/${job.estimateId}`} className="font-medium text-brand hover:underline">
              View estimate #{job.estimateNumber} →
            </a>
          )}
          {job.invoiceId && (
            <a href={`/invoices/${job.invoiceId}`} className="font-medium text-brand hover:underline">
              View invoice #{job.invoiceNumber} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
