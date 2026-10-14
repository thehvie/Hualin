"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyProposal, dismissProposal, dismissReminder, sendReminder } from "@/app/(dashboard)/dispatch/ai-actions";
import type { DraftItem, ProposalItem } from "@/lib/rental-ai-queue";

function Draft({ d }: { d: DraftItem }) {
  const [body, setBody] = useState(d.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
    });

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <Link href={`/jobs/${d.jobId}`} className="font-semibold text-zinc-900 hover:text-brand">
          {d.customer}
        </Link>
        <span className="text-zinc-600">{d.unit}</span>
        <span className="text-xs text-zinc-500">pickup {d.pickup}</span>
        <span className="text-xs text-zinc-400">{d.channel === "sms" ? "by text" : "by email"}</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={d.channel === "sms" ? 3 : 6}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      <div className="flex items-center gap-2">
        <button type="button" disabled={pending || !body.trim()} onClick={() => run(() => sendReminder(d.id, body))} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Send reminder"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => dismissReminder(d.id))} className="text-xs text-zinc-400 hover:text-zinc-700">
          Skip
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </li>
  );
}

function Proposal({ p }: { p: ProposalItem }) {
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else if (res.note) setNote(res.note);
    });

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-3 text-sm">
        <Link href={`/jobs/${p.jobId}`} className="font-semibold text-zinc-900 hover:text-brand">
          {p.customer}
        </Link>
        <span className="text-zinc-600">{p.unit}</span>
      </div>
      <p className="rounded-lg bg-zinc-50 p-2 text-sm italic text-zinc-600">&ldquo;{p.message}&rdquo;</p>
      <p className="text-sm text-zinc-800">
        <span className="mr-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800">AI read</span>
        {p.summary}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => applyProposal(p.id))} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {pending ? "Working…" : p.kind === "PICKUP" ? "Confirm pickup request" : "Confirm extension"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => dismissProposal(p.id))} className="text-xs text-zinc-400 hover:text-zinc-700">
          Ignore
        </button>
        <span className="text-xs text-zinc-400">The customer gets a short confirmation text or email.</span>
        {error && <span className="text-xs text-red-600">{error}</span>}
        {note && <span className="text-xs text-amber-700">{note}</span>}
      </div>
    </li>
  );
}

/** Reminder drafts to approve and AI readings of customer replies, waiting for one-tap confirmation. */
export function RentalAiPanel({ drafts, proposals }: { drafts: DraftItem[]; proposals: ProposalItem[] }) {
  if (drafts.length === 0 && proposals.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {proposals.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Customer replies to confirm ({proposals.length})</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-violet-200 bg-white">
            {proposals.map((p) => (
              <Proposal key={p.id} p={p} />
            ))}
          </ul>
        </section>
      )}
      {drafts.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Reminders to approve ({drafts.length})</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-amber-200 bg-white">
            {drafts.map((d) => (
              <Draft key={d.id} d={d} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
