"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveReviewSettings } from "./actions";

export interface ReviewSettings {
  link: string;
  on: boolean;
  days: number;
  startHour: number;
  endHour: number;
}

const hourLabel = (h: number) => (h === 0 || h === 24 ? "12 am" : h === 12 ? "12 pm" : h < 12 ? `${h} am` : `${h - 12} pm`);

const field = "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

/** Google review link: shown on invoices, and optionally asked for by email and text a few days after an invoice is paid. */
export function ReviewCard({ initial }: { initial: ReviewSettings }) {
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ReviewSettings>(k: K, value: ReviewSettings[K]) => setV((x) => ({ ...x, [k]: value }));

  function save() {
    setMessage(null);
    start(async () => {
      const res = await saveReviewSettings(v);
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Google reviews</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Paste your Google review link. It appears on invoices (the page, the PDF and the invoice email) so customers can review you right away.
          In Google Business Profile, choose &ldquo;Ask for reviews&rdquo; to copy the link.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Review link</span>
        <input value={v.link} onChange={(e) => set("link", e.target.value)} placeholder="https://g.page/r/your-business/review" className={field} />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input type="checkbox" checked={v.on} onChange={(e) => set("on", e.target.checked)} className="h-4 w-4 accent-brand" />
        Also ask for a review after the invoice is paid
      </label>

      <div className={`flex flex-col gap-2 ${v.on ? "" : "pointer-events-none opacity-50"}`}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Days after payment</span>
            <input type="number" min={0} max={60} value={v.days} onChange={(e) => set("days", Number(e.target.value))} className={`${field} w-28`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Send between</span>
            <select value={v.startHour} onChange={(e) => set("startHour", Number(e.target.value))} className={field}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">and</span>
            <select value={v.endHour} onChange={(e) => set("endHour", Number(e.target.value))} className={field}>
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-zinc-400">
          One request per invoice, sent in that window (your time zone), by email and by text when the customer has a mobile number (texts count toward your plan and need texting set up). Only invoices paid after you
          turn this on are asked. Edit the wording or switch email or text off in{" "}
          <Link href="/settings/customer-requests" className="font-medium text-brand hover:underline">
            Customer messages
          </Link>
          .
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
