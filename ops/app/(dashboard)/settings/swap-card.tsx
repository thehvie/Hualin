"use client";

import { useState, useTransition } from "react";
import { saveSwapSettings } from "./actions";

export interface SwapSettings {
  policy: "OFF" | "FREE" | "FLAT" | "FULL";
  feeDollars: string;
}

const field = "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const OPTIONS: { value: SwapSettings["policy"]; title: string; text: string }[] = [
  { value: "OFF", title: "We don't do swaps", text: "Customers can still ask for a pickup or more time, but not a swap." },
  { value: "FREE", title: "Free swap", text: "No charge to swap a full dumpster for an empty one." },
  { value: "FLAT", title: "Flat swap fee", text: "A set fee added to the invoice for each swap." },
  { value: "FULL", title: "Full package rate", text: "A swap is charged the dumpster's full package price again, like a new rental." },
];

/** Whether customers can ask to swap a full dumpster, and what it costs. */
export function SwapCard({ initial }: { initial: SwapSettings }) {
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMessage(null);
    start(async () => {
      const res = await saveSwapSettings(v);
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Swap-outs</h2>
        <p className="mt-1 text-xs text-zinc-500">
          When a customer&apos;s dumpster is full, they can ask for an empty one on their rental page. You confirm each request on the Dispatch page. The charge is added to the invoice
          automatically, so don&apos;t add another package for the replacement.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex items-start gap-2 text-sm text-zinc-800">
            <input type="radio" name="swap" checked={v.policy === o.value} onChange={() => setV((x) => ({ ...x, policy: o.value }))} className="mt-1 accent-brand" />
            <span>
              <strong>{o.title}</strong>: {o.text}
            </span>
          </label>
        ))}
      </fieldset>

      {v.policy === "FLAT" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-zinc-700">Swap fee ($)</span>
          <input inputMode="decimal" value={v.feeDollars} onChange={(e) => setV((x) => ({ ...x, feeDollars: e.target.value }))} placeholder="75" className={`${field} w-32`} />
        </label>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
