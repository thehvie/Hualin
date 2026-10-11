"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { markDelivered, markPickedUp, requestPickup, undoRentalStep } from "@/app/(dashboard)/dispatch/actions";

export interface RentalStop {
  id: string;
  jobId: string;
  status: "RESERVED" | "DELIVERED" | "PICKUP_REQUESTED" | "PICKED_UP";
  category: string | null;
  unit: string | null;
  customer: string;
  phone: string | null;
  address: string | null;
  startLabel: string;
  endLabel: string;
  overdue: boolean;
  placementNotes: string | null;
  weightTons: number | null;
  ticketNumber: string | null;
  /** Extra days or overweight owed beyond the package price; added to the invoice when it's created. */
  charges: { summary: string; totalCents: number } | null;
}

const STATUS_LABEL = { RESERVED: "Scheduled", DELIVERED: "On site", PICKUP_REQUESTED: "Pickup requested", PICKED_UP: "Picked up" } as const;
const STATUS_STYLE = {
  RESERVED: "bg-zinc-100 text-zinc-700",
  DELIVERED: "bg-sky-100 text-sky-800",
  PICKUP_REQUESTED: "bg-amber-100 text-amber-800",
  PICKED_UP: "bg-emerald-100 text-emerald-800",
} as const;

const input = "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

/** One dumpster on a job with the buttons for its next step: deliver, request pickup, pick up (with the weight). */
export function RentalRow({ stop }: { stop: RentalStop }) {
  const [panel, setPanel] = useState<"deliver" | "pickup" | null>(null);
  const [notes, setNotes] = useState("");
  const [weight, setWeight] = useState("");
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else after?.();
    });

  const directions = stop.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}&travelmode=driving` : null;

  return (
    <li className={`flex flex-col gap-2 px-4 py-3 ${stop.overdue ? "bg-red-50/60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={`/jobs/${stop.jobId}`} className="font-semibold text-zinc-900 hover:text-brand">
          {stop.customer}
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[stop.status]}`}>{STATUS_LABEL[stop.status]}</span>
        <span className="text-sm text-zinc-600">
          {stop.category ?? "Dumpster"}
          {stop.unit ? ` · ${stop.unit}` : " · no unit assigned"}
        </span>
        <span className={`text-xs ${stop.overdue ? "font-semibold text-red-700" : "text-zinc-500"}`}>
          {stop.status === "RESERVED" ? `Deliver ${stop.startLabel}` : `Pickup ${stop.endLabel}`}
          {stop.overdue ? " · overdue" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        {stop.address &&
          (directions ? (
            <a href={directions} target="_blank" rel="noreferrer" className="hover:text-brand">
              📍 {stop.address}
            </a>
          ) : null)}
        {stop.phone && (
          <a href={`tel:${stop.phone}`} className="hover:text-brand">
            📞 {stop.phone}
          </a>
        )}
        {stop.placementNotes && <span>Placed: {stop.placementNotes}</span>}
        {stop.status === "PICKED_UP" && (
          <span>
            {stop.weightTons != null ? `${stop.weightTons} tons` : "No weight recorded"}
            {stop.ticketNumber ? ` · ticket ${stop.ticketNumber}` : ""}
          </span>
        )}
      </div>

      {stop.charges && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          <strong>Extra charges {formatCents(stop.charges.totalCents)}</strong> will be added to the invoice: {stop.charges.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {stop.status === "RESERVED" && (
          <button type="button" disabled={pending || !stop.unit} onClick={() => setPanel(panel === "deliver" ? null : "deliver")} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" title={stop.unit ? undefined : "Assign a unit on the estimate first"}>
            Mark delivered
          </button>
        )}
        {stop.status === "DELIVERED" && (
          <button type="button" disabled={pending} onClick={() => run(() => requestPickup(stop.id))} className="rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50">
            Customer wants pickup
          </button>
        )}
        {(stop.status === "DELIVERED" || stop.status === "PICKUP_REQUESTED") && (
          <button type="button" disabled={pending} onClick={() => setPanel(panel === "pickup" ? null : "pickup")} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            Mark picked up
          </button>
        )}
        {stop.status !== "RESERVED" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Step this rental back one stage?")) run(() => undoRentalStep(stop.id));
            }}
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            Undo
          </button>
        )}
      </div>

      {panel === "deliver" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-3">
          <input className={`${input} min-w-0 flex-1`} placeholder="Where it was placed (driveway, left side…) — optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" disabled={pending} onClick={() => run(() => markDelivered(stop.id, notes), () => setPanel(null))} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {pending ? "Saving…" : "Confirm delivery"}
          </button>
        </div>
      )}
      {panel === "pickup" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 p-3">
          <input className={`${input} w-32`} type="number" step="0.01" min="0" placeholder="Tons" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <input className={`${input} w-40`} placeholder="Ticket # (optional)" value={ticket} onChange={(e) => setTicket(e.target.value)} />
          <button type="button" disabled={pending} onClick={() => run(() => markPickedUp(stop.id, { weightTons: weight, ticketNumber: ticket }), () => setPanel(null))} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {pending ? "Saving…" : "Confirm pickup"}
          </button>
          <span className="text-xs text-zinc-400">Weight from the scale ticket; used for overweight charges.</span>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
