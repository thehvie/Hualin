"use client";

import { useState, useTransition } from "react";
import { assignUnit, autoAssignUnits, cancelRental, reserveRentals } from "@/app/(dashboard)/estimates/[id]/rental-actions";
import type { RentalCardData } from "@/lib/rentals";
import { RentalCountdown } from "@/components/rental-countdown";

const STATUS_LABEL: Record<string, string> = {
  RESERVED: "Reserved",
  DELIVERED: "Delivered",
  PICKUP_REQUESTED: "Pickup requested",
  PICKED_UP: "Picked up",
};
const STATUS_STYLE: Record<string, string> = {
  RESERVED: "bg-zinc-100 text-zinc-700",
  DELIVERED: "bg-sky-100 text-sky-800",
  PICKUP_REQUESTED: "bg-amber-100 text-amber-800",
  PICKED_UP: "bg-emerald-100 text-emerald-800",
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Dumpster rentals on an estimate: reserve what the items call for, then give each reservation a specific unit. */
export function RentalsCard({ estimateId, data }: { estimateId: string; data: RentalCardData }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!data.hasPackageLines) return null;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      setMessage(null);
      const res = await fn();
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "") : (res.error ?? "Something went wrong.") });
    });

  const active = data.bookings.length;
  const unassigned = data.bookings.filter((b) => b.status === "RESERVED" && !b.assetId).length;
  const outOfSync = active !== data.unitsNeeded;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">Dumpster rentals</h2>
        <div className="flex gap-2">
          {unassigned > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => autoAssignUnits(estimateId))}
              className="rounded-lg border border-brand px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-50"
            >
              Auto-assign units
            </button>
          )}
          {(active === 0 || outOfSync) && (
            <button
              type="button"
              disabled={pending || !data.scheduled}
              onClick={() => run(() => reserveRentals(estimateId))}
              title={data.scheduled ? undefined : "Set the delivery date first"}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {active === 0 ? `Reserve ${data.unitsNeeded} dumpster${data.unitsNeeded === 1 ? "" : "s"}` : "Update reservations"}
            </button>
          )}
        </div>
      </div>

      {!data.scheduled && active === 0 && (
        <p className="text-sm text-zinc-500">Set the delivery date in the Schedule card, then reserve the dumpsters this estimate calls for.</p>
      )}
      {data.scheduled && active === 0 && (
        <p className="text-sm text-zinc-500">
          This estimate has {data.unitsNeeded} dumpster{data.unitsNeeded === 1 ? "" : "s"}. Reserve them to hold specific units for these dates.
        </p>
      )}
      {outOfSync && active > 0 && (
        <p className="mb-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          The estimate calls for {data.unitsNeeded} but {active} {active === 1 ? "is" : "are"} reserved. Update the reservations to match.
        </p>
      )}

      {active > 0 && (
        <ul className="divide-y divide-zinc-100">
          {data.bookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              <span className="w-16 font-semibold text-zinc-900">{b.category ?? "Any size"}</span>
              <span className="text-xs text-zinc-500">
                {fmt(b.startAt)} → {fmt(b.endAt)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                {STATUS_LABEL[b.status] ?? b.status}
              </span>
              {b.status !== "PICKED_UP" && (
                <RentalCountdown
                  bar={false}
                  data={{
                    status: b.status as "RESERVED" | "DELIVERED" | "PICKUP_REQUESTED",
                    startAt: b.startAt,
                    endAt: b.endAt,
                    deliveredAt: b.deliveredAt,
                    tz: data.tz,
                    terms: b.priceBookItemId ? (data.terms[b.priceBookItemId] ?? null) : null,
                  }}
                />
              )}
              <div className="ml-auto flex items-center gap-2">
                {b.status === "RESERVED" ? (
                  <>
                    <select
                      value={b.assetId ?? ""}
                      disabled={pending}
                      onChange={(e) => run(() => assignUnit(estimateId, b.id, e.target.value || null))}
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-brand"
                    >
                      <option value="">{b.options.length === 0 ? "None free" : "Choose a unit…"}</option>
                      {b.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => cancelRental(estimateId, b.id))}
                      className="text-xs text-zinc-400 hover:text-red-600"
                      title="Cancel this reservation"
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="font-medium text-zinc-900">{b.options.find((o) => o.id === b.assetId)?.label ?? ""}</span>
                )}
              </div>
              {b.status === "RESERVED" && !b.assetId && b.options.length === 0 && (
                <p className="w-full text-xs text-red-600">No {b.category ?? ""} dumpster is free for these dates.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && message.text && <p className={`mt-2 text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}
