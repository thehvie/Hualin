"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createAsset, deleteAsset, updateAsset } from "./actions";

interface RentalInfo {
  customer: string;
  address: string | null;
  startAt: string;
  endAt: string;
  jobId: string;
  status: string;
}

export interface FleetUnit {
  id: string;
  label: string;
  category: string | null;
  status: "AVAILABLE" | "ON_RENT" | "MAINTENANCE" | "RETIRED";
  notes: string | null;
  current: RentalInfo | null;
  next: RentalInfo | null;
}

const STATUS_STYLE: Record<FleetUnit["status"], string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  ON_RENT: "bg-sky-100 text-sky-800",
  MAINTENANCE: "bg-amber-100 text-amber-800",
  RETIRED: "bg-zinc-200 text-zinc-600",
};
const STATUS_LABEL: Record<FleetUnit["status"], string> = {
  AVAILABLE: "Available",
  ON_RENT: "On rent",
  MAINTENANCE: "Maintenance",
  RETIRED: "Retired",
};

const input =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function UnitRow({ unit, categories }: { unit: FleetUnit; categories: string[] }) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(unit.label);
  const [category, setCategory] = useState(unit.category ?? "");
  const [notes, setNotes] = useState(unit.notes ?? "");
  const [status, setStatus] = useState<"AVAILABLE" | "MAINTENANCE" | "RETIRED">(unit.status === "ON_RENT" ? "AVAILABLE" : unit.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateAsset(unit.id, { label, category, notes, status });
      if (!res.ok) setError(res.error);
      else setEditing(false);
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-20 font-semibold text-zinc-900">{unit.label}</span>
        <span className="w-20 text-sm text-zinc-500">{unit.category ?? "—"}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[unit.status]}`}>{STATUS_LABEL[unit.status]}</span>
        <div className="min-w-0 flex-1 text-xs text-zinc-500">
          {unit.current ? (
            <Link href={`/jobs/${unit.current.jobId}`} className="hover:text-brand">
              {unit.current.customer}
              {unit.current.address ? ` · ${unit.current.address}` : ""} · back {fmt(unit.current.endAt)}
            </Link>
          ) : unit.next ? (
            <Link href={`/jobs/${unit.next.jobId}`} className="hover:text-brand">
              Next: {unit.next.customer} · {fmt(unit.next.startAt)}–{fmt(unit.next.endAt)}
            </Link>
          ) : null}
        </div>
        <button type="button" onClick={() => setEditing(!editing)} className="text-xs font-medium text-brand hover:underline">
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
            <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Size, e.g. 20 yd" list="fleet-categories" />
            <select
              className={input}
              value={status}
              disabled={unit.status === "ON_RENT"}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              title={unit.status === "ON_RENT" ? "Out on rent. It returns to Available when it is picked up." : undefined}
            >
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
          <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (dents, door issues, last inspection…)" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Delete ${unit.label}?`)) return;
                startTransition(async () => {
                  const res = await deleteAsset(unit.id);
                  if (!res.ok) setError(res.error);
                });
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      <datalist id="fleet-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </li>
  );
}

export function FleetManager({ units, categories }: { units: FleetUnit[]; categories: string[] }) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"ALL" | FleetUnit["status"]>("ALL");

  const counts = (s: FleetUnit["status"]) => units.filter((u) => u.status === s).length;
  const shown = filter === "ALL" ? units : units.filter((u) => u.status === filter);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createAsset({ label, category, notes });
      if (!res.ok) return setError(res.error);
      setLabel("");
      setNotes("");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["AVAILABLE", "ON_RENT", "MAINTENANCE", "RETIRED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? "ALL" : s)}
            className={`rounded-xl border p-4 text-left ${filter === s ? "border-brand bg-brand/5" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
          >
            <p className="text-2xl font-bold text-zinc-900">{counts(s)}</p>
            <p className="text-xs font-medium text-zinc-500">{STATUS_LABEL[s]}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Add a dumpster</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. D-12" />
          <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Size, e.g. 20 yd" list="fleet-categories-add" />
          <input className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
          <button type="button" disabled={pending || !label.trim()} onClick={add} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Add
          </button>
        </div>
        <datalist id="fleet-categories-add">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-zinc-400">
          Use the same size text on your rental price book items (for example &ldquo;20 yd&rdquo;) so the right units are offered for each rental.
        </p>
      </div>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-400">
          <span className="mb-1 block text-2xl">🚛</span>
          No dumpsters yet. Add your first one above.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {shown.map((u) => (
            <UnitRow key={u.id} unit={u} categories={categories} />
          ))}
          {shown.length === 0 && <li className="p-6 text-center text-sm text-zinc-400">Nothing with that status.</li>}
        </ul>
      )}
    </div>
  );
}
