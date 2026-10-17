"use client";

import { useState, useTransition } from "react";

import { createDriver, createDriverLogin, deleteDriver, removeDriverLogin, setDriverActive, updateDriver, type DriverInput } from "./actions";
import { DRIVER_COLORS } from "@/lib/drivers";
import { formatPhone } from "@/lib/phone";

export interface DriverRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  vehicle: string | null;
  color: string;
  notes: string | null;
  active: boolean;
  loginEmail: string | null;
}

const field = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const blank: DriverInput = { name: "", phone: "", email: "", vehicle: "", color: DRIVER_COLORS[0], notes: "" };

function Badge({ name, color }: { name: string; color: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: color }} aria-hidden>
      {initials || "?"}
    </span>
  );
}

function DriverForm({ initial, onSave, onCancel, pending, error, submitLabel }: { initial: DriverInput; onSave: (v: DriverInput) => void; onCancel: () => void; pending: boolean; error: string | null; submitLabel: string }) {
  const [v, setV] = useState(initial);
  const set = (k: keyof DriverInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={v.name} onChange={set("name")} placeholder="Name" className={field} />
        <input value={v.phone} onChange={set("phone")} placeholder="Mobile phone" inputMode="tel" className={field} />
        <input value={v.email} onChange={set("email")} placeholder="Email (optional)" type="email" className={field} />
        <input value={v.vehicle} onChange={set("vehicle")} placeholder="Usual truck, like Truck 2" className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">Map colour</span>
        {DRIVER_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => setV((x) => ({ ...x, color: c }))}
            className={`h-6 w-6 rounded-full border-2 ${v.color === c ? "border-zinc-900" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <textarea value={v.notes} onChange={set("notes")} placeholder="Notes (license class, certifications, days off...)" rows={2} className={field} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => onSave(v)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

function LoginForm({ id, defaultEmail, run, pending, error, onCancel }: { id: string; defaultEmail: string; run: (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void; pending: boolean; error: string | null; onCancel: () => void }) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3">
      <p className="text-xs text-zinc-500">A login lets them see their own stops on their phone. They can&apos;t see the rest of your business.</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Sign-in email" type="email" className={field} />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Starting password (8+ characters)" type="password" className={field} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => run(() => createDriverLogin(id, { email, password }), onCancel)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          Create login
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** The company's drivers: add, edit, take off the schedule, and give a login for the phone view. */
export function DriversManager({ drivers, canEdit }: { drivers: DriverRow[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [loginFor, setLoginFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else {
        setEditing(null);
        after?.();
      }
    });

  const active = drivers.filter((d) => d.active);
  const inactive = drivers.filter((d) => !d.active);

  const card = (d: DriverRow) =>
    editing === d.id ? (
      <li key={d.id}>
        <DriverForm initial={{ name: d.name, phone: formatPhone(d.phone), email: d.email ?? "", vehicle: d.vehicle ?? "", color: d.color, notes: d.notes ?? "" }} submitLabel="Save" pending={pending} error={error} onCancel={() => setEditing(null)} onSave={(v) => run(() => updateDriver(d.id, v))} />
      </li>
    ) : (
      <li key={d.id} className={`rounded-xl border border-zinc-200 bg-white p-4 ${d.active ? "" : "opacity-70"}`}>
        <div className="flex items-start gap-3">
          <Badge name={d.name} color={d.color} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-zinc-900">
              {d.name}
              {d.vehicle && <span className="font-normal text-zinc-500"> · {d.vehicle}</span>}
            </p>
            <p className="text-sm text-zinc-600">{[formatPhone(d.phone), d.email].filter(Boolean).join(" · ") || "No contact details"}</p>
            {d.notes && <p className="mt-0.5 whitespace-pre-wrap text-xs text-zinc-500">{d.notes}</p>}
            <p className="mt-1 text-xs">
              {d.loginEmail ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">Has login: {d.loginEmail}</span> : <span className="text-zinc-400">No login. Dispatched by the office.</span>}
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-12 text-xs">
            <button type="button" onClick={() => { setError(null); setEditing(d.id); }} className="font-medium text-zinc-500 hover:text-zinc-800">
              Edit
            </button>
            {d.loginEmail ? (
              <button type="button" disabled={pending} onClick={() => window.confirm(`Remove ${d.name}'s login? They can no longer sign in.`) && run(() => removeDriverLogin(d.id))} className="font-medium text-zinc-500 hover:text-zinc-800">
                Remove login
              </button>
            ) : (
              <button type="button" onClick={() => { setError(null); setLoginFor(loginFor === d.id ? null : d.id); }} className="font-medium text-zinc-500 hover:text-zinc-800">
                Give a login
              </button>
            )}
            <button type="button" disabled={pending} onClick={() => run(() => setDriverActive(d.id, !d.active))} className="font-medium text-zinc-500 hover:text-zinc-800">
              {d.active ? "Mark off the schedule" : "Back on the schedule"}
            </button>
            <button type="button" disabled={pending} onClick={() => window.confirm(`Delete ${d.name}? This can't be undone.`) && run(() => deleteDriver(d.id))} className="font-medium text-red-500 hover:text-red-700">
              Delete
            </button>
          </div>
        )}
        {loginFor === d.id && <div className="pl-12"><LoginForm id={d.id} defaultEmail={d.email ?? ""} run={run} pending={pending} error={error} onCancel={() => setLoginFor(null)} /></div>}
      </li>
    );

  return (
    <div className="flex flex-col gap-4">
      {error && editing === null && loginFor === null && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {canEdit && editing !== "new" && (
        <div>
          <button type="button" onClick={() => { setError(null); setEditing("new"); }} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            + Add driver
          </button>
        </div>
      )}
      {editing === "new" && <DriverForm initial={blank} submitLabel="Add driver" pending={pending} error={error} onCancel={() => setEditing(null)} onSave={(v) => run(() => createDriver(v))} />}

      {drivers.length === 0 && editing !== "new" && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">No drivers yet. Add the people who drive your trucks, then assign deliveries and pickups to them from Dispatch.</p>
      )}

      {active.length > 0 && <ul className="flex flex-col gap-3">{active.map(card)}</ul>}
      {inactive.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Off the schedule</p>
          <ul className="flex flex-col gap-3">{inactive.map(card)}</ul>
        </div>
      )}
    </div>
  );
}
