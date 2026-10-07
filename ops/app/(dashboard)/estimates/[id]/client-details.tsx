"use client";

import { useState, useTransition } from "react";
import { US_STATES } from "@/lib/us-states";
import { updateEstimateClient } from "./actions";

export interface ClientData {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
    email: string | null;
    phone: string | null;
  };
  property: { addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string } | null;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </label>
  );
}

/** The client and service address columns of the estimate header, with an inline editor. */
export function ClientDetails({ estimateId, data, defaultState }: { estimateId: string; data: ClientData; defaultState: string | null }) {
  const { customer, property } = data;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    addressLine1: property?.addressLine1 ?? "",
    addressLine2: property?.addressLine2 ?? "",
    city: property?.city ?? "",
    state: property?.state ?? defaultState ?? "",
    zip: property?.zip ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateEstimateClient(estimateId, form);
      if (res && "error" in res) setError(res.error);
      else setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 sm:col-span-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Client details</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name" value={form.firstName} onChange={set("firstName")} />
          <Field label="Last name" value={form.lastName} onChange={set("lastName")} />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} />
          <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
        </div>
        <Field label="Company name" value={form.companyName} onChange={set("companyName")} />

        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label="Address" value={form.addressLine1} onChange={set("addressLine1")} />
          <Field label="Unit" value={form.addressLine2} onChange={set("addressLine2")} />
        </div>
        <div className={`grid grid-cols-1 gap-3 ${defaultState ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <Field label="City" value={form.city} onChange={set("city")} />
          {!defaultState && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">State</span>
              <select value={form.state} onChange={(e) => set("state")(e.target.value)} className={inputClass}>
                <option value="">Select…</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Field label="Zip" value={form.zip} onChange={set("zip")} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-zinc-400">
          Name, email and phone update the customer everywhere. If this address is used by the customer&apos;s other jobs, a new address is
          added for this estimate instead of changing theirs.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Client details</p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand hover:underline">
            Edit
          </button>
        </div>
        <a href={`/customers/${customer.id}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
          {customer.firstName} {customer.lastName}
        </a>
        {customer.companyName && <p className="text-sm text-zinc-500">{customer.companyName}</p>}
        {customer.email && <p className="text-sm text-zinc-500">{customer.email}</p>}
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="text-sm text-zinc-500 hover:text-brand">
            {customer.phone}
          </a>
        )}
      </div>
      <div>
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brand hover:underline">
            Edit
          </button>
        </div>
        {property ? (
          <p className="mt-1 text-sm text-zinc-700">
            {property.addressLine1}
            {property.addressLine2 ? `, ${property.addressLine2}` : ""}
            <br />
            {property.city}, {property.state} {property.zip}
          </p>
        ) : (
          <p className="mt-1 text-sm text-zinc-400">No property on file</p>
        )}
      </div>
    </>
  );
}
