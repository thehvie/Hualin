"use client";

import { useMemo, useState, useTransition } from "react";
import { createDirectInvoice } from "../actions";

interface CustomerOption {
  id: string;
  label: string;
  detail: string;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <input className={inputClass} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function NewInvoiceForm({
  customers,
  preselectedCustomerId,
  defaultState,
}: {
  customers: CustomerOption[];
  preselectedCustomerId: string | null;
  defaultState: string | null;
}) {
  const [mode, setMode] = useState<"existing" | "new">(preselectedCustomerId || customers.length > 0 ? "existing" : "new");
  const [customerId, setCustomerId] = useState<string | null>(preselectedCustomerId);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [nc, setNc] = useState({ firstName: "", lastName: "", companyName: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: defaultState ?? "", zip: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = customers.find((c) => c.id === customerId) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? customers.filter((c) => `${c.label} ${c.detail}`.toLowerCase().includes(q)) : customers).slice(0, 8);
  }, [customers, query]);

  function create() {
    setError(null);
    if (mode === "existing" && !customerId) return setError("Choose a customer, or switch to New customer.");
    startTransition(async () => {
      const res = await createDirectInvoice({
        customerId: mode === "existing" ? (customerId ?? undefined) : undefined,
        customer: mode === "new" ? nc : undefined,
        name,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Customer</h2>
        <div className="inline-flex rounded-full border border-zinc-300 p-0.5 text-xs font-semibold">
          {(["existing", "new"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`rounded-full px-3 py-1 ${mode === m ? "bg-brand text-white" : "text-zinc-600 hover:text-zinc-900"}`}>
              {m === "existing" ? "Existing customer" : "New customer"}
            </button>
          ))}
        </div>
      </div>

      {mode === "existing" ? (
        selected ? (
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-zinc-900">{selected.label}</p>
              {selected.detail && <p className="text-xs text-zinc-500">{selected.detail}</p>}
            </div>
            <button type="button" onClick={() => setCustomerId(null)} className="text-xs font-medium text-brand hover:underline">
              Change
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input autoFocus className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers by name, email or phone…" />
            {matches.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No customers match.{" "}
                <button type="button" onClick={() => setMode("new")} className="font-medium text-brand hover:underline">
                  Add a new customer
                </button>
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCustomerId(c.id)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-50">
                      <span className="text-sm font-medium text-zinc-900">{c.label}</span>
                      {c.detail && <span className="text-xs text-zinc-500">{c.detail}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="First name *" value={nc.firstName} onChange={(v) => setNc({ ...nc, firstName: v })} />
            <Field label="Last name *" value={nc.lastName} onChange={(v) => setNc({ ...nc, lastName: v })} />
            <Field label="Email" type="email" value={nc.email} onChange={(v) => setNc({ ...nc, email: v })} />
            <Field label="Phone" type="tel" value={nc.phone} onChange={(v) => setNc({ ...nc, phone: v })} />
          </div>
          <Field label="Company name" value={nc.companyName} onChange={(v) => setNc({ ...nc, companyName: v })} placeholder="Optional" />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Address (optional)</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="Address" value={nc.addressLine1} onChange={(v) => setNc({ ...nc, addressLine1: v })} />
            <Field label="Unit" value={nc.addressLine2} onChange={(v) => setNc({ ...nc, addressLine2: v })} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
            <Field label="City" value={nc.city} onChange={(v) => setNc({ ...nc, city: v })} />
            <Field label="State" value={nc.state} onChange={(v) => setNc({ ...nc, state: v.toUpperCase().slice(0, 2) })} placeholder="FL" />
            <Field label="Zip" value={nc.zip} onChange={(v) => setNc({ ...nc, zip: v })} />
          </div>
        </div>
      )}

      <Field label="Invoice name (optional)" value={name} onChange={setName} placeholder="e.g. Garage cleanout, March rental" />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={create} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
    </div>
  );
}
