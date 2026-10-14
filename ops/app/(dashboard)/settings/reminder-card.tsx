"use client";

import { useState, useTransition } from "react";
import { saveReminderSettings } from "./actions";

export interface ReminderSettings {
  on: boolean;
  hours: number;
  auto: boolean;
  ai: boolean;
  quietStart: number;
  quietEnd: number;
}

const field = "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const hourLabel = (h: number) => (h === 0 || h === 24 ? "12 am" : h === 12 ? "12 pm" : h < 12 ? `${h} am` : `${h - 12} pm`);

/** Rental reminders: when customers are told their rental time is almost up, and whether you approve each one first. */
export function ReminderCard({ initial }: { initial: ReminderSettings }) {
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof ReminderSettings>(k: K, value: ReminderSettings[K]) => setV((x) => ({ ...x, [k]: value }));

  function save() {
    setMessage(null);
    start(async () => {
      const res = await saveReminderSettings(v);
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Rental reminders</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Before a dumpster&apos;s rental time runs out, the customer gets a text (or an email if texting isn&apos;t available) with the pickup time and how to ask for more time.
          Rules decide when it goes out; AI only words it and reads their reply.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
        <input type="checkbox" checked={v.on} onChange={(e) => set("on", e.target.checked)} className="h-4 w-4 accent-brand" />
        Send rental reminders
      </label>

      <div className={`flex flex-col gap-4 ${v.on ? "" : "pointer-events-none opacity-50"}`}>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Hours before pickup</span>
            <input type="number" min={3} max={72} value={v.hours} onChange={(e) => set("hours", Number(e.target.value))} className={`${field} w-28`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">Only send from</span>
            <select value={v.quietStart} onChange={(e) => set("quietStart", Number(e.target.value))} className={field}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">until</span>
            <select value={v.quietEnd} onChange={(e) => set("quietEnd", Number(e.target.value))} className={field}>
              {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="-mt-2 text-xs text-zinc-400">
          Rentals of {v.hours} hours or less get one reminder 2 hours before instead. Times are in your company timezone. Nothing is sent once a pickup is requested or while an extension is waiting for you.
        </p>

        <fieldset className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm text-zinc-800">
            <input type="radio" name="mode" checked={!v.auto} onChange={() => set("auto", false)} className="mt-1 accent-brand" />
            <span>
              <strong>Review first</strong> (recommended): reminders wait on the Dispatch page for you to approve.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-zinc-800">
            <input type="radio" name="mode" checked={v.auto} onChange={() => set("auto", true)} className="mt-1 accent-brand" />
            <span>
              <strong>Send automatically</strong>: reminders go out on their own.
            </span>
          </label>
        </fieldset>

        <label className="flex items-start gap-2 text-sm text-zinc-800">
          <input type="checkbox" checked={v.ai} onChange={(e) => set("ai", e.target.checked)} className="mt-1 h-4 w-4 accent-brand" />
          <span>
            <strong>AI writes the message and reads replies.</strong> &ldquo;Keep it till Friday&rdquo; or &ldquo;ready for pickup&rdquo; becomes a one-tap suggestion on the Dispatch page. Counts toward your AI usage.
          </span>
        </label>
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
