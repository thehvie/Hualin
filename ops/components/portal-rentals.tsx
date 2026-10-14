"use client";

import { useState, useTransition } from "react";

import { requestExtension, requestPickup, requestSwap } from "@/app/e/[token]/rental-requests";
import { MAX_EXTENSION_DAYS, type PortalRental } from "@/lib/rental-portal";

type Res = { ok: boolean; error?: string };

function Rental({ token, r }: { token: string; r: PortalRental }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [days, setDays] = useState(1);

  const run = (label: string, fn: () => Promise<Res>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) setSent(label);
      else setError(res.error ?? "Something went wrong. Please call us.");
    });

  const out = r.status === "DELIVERED";
  const btn = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{r.unit}</p>
        <p className="mt-0.5 text-sm text-zinc-600">
          {r.status === "RESERVED" && <>Delivery: {r.deliveryLabel}. Pickup: {r.pickupLabel}.</>}
          {r.status === "DELIVERED" && <>On site. Pickup scheduled for {r.pickupLabel}.</>}
          {r.status === "PICKUP_REQUESTED" && <>Pickup requested. We&apos;ll be in touch about timing.</>}
        </p>
      </div>

      {sent && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{sent} We&apos;ll confirm by text or email shortly.</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {out && !sent && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || r.pending.PICKUP} className={btn} onClick={() => run("Pickup requested.", () => requestPickup(token, r.id))}>
              {r.pending.PICKUP ? "Pickup requested" : "I'm done, pick it up"}
            </button>
            {r.swapNote && (
              <button type="button" disabled={pending || r.pending.SWAP} className={btn} onClick={() => run("Swap requested.", () => requestSwap(token, r.id))}>
                {r.pending.SWAP ? "Swap requested" : `It's full, swap for an empty one (${r.swapNote})`}
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-zinc-700" htmlFor={`days-${r.id}`}>
              Need more time?
            </label>
            <select id={`days-${r.id}`} value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm">
              {Array.from({ length: MAX_EXTENSION_DAYS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} more day{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <button type="button" disabled={pending || r.pending.EXTEND} className={btn} onClick={() => run("Extension requested.", () => requestExtension(token, r.id, days))}>
              {r.pending.EXTEND ? "Extension requested" : "Request"}
            </button>
            {r.extraDayPrice && <span className="text-xs text-zinc-500">{r.extraDayPrice} per extra day</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function PortalRentals({ token, rentals }: { token: string; rentals: PortalRental[] }) {
  if (rentals.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Your rental</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Done early, need more time, or it&apos;s full? Ask here. We confirm every request.</p>
      </div>
      {rentals.map((r) => (
        <Rental key={r.id} token={token} r={r} />
      ))}
    </div>
  );
}
