"use client";

import { useState, useTransition } from "react";
import { createEstimateWithJob } from "../actions";

interface CustomerOption {
  id: string;
  label: string;
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} className={inputClass} />
    </div>
  );
}

export function NewEstimateForm({
  customers,
  preselectedCustomerId,
}: {
  customers: CustomerOption[];
  preselectedCustomerId: string | null;
}) {
  const [mode, setMode] = useState<"new" | "existing">(
    preselectedCustomerId || customers.length > 0 ? "existing" : "new",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("mode", mode);
    startTransition(async () => {
      const res = await createEstimateWithJob(fd);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Customer</h2>
          {customers.length > 0 && (
            <div className="inline-flex rounded-full border border-zinc-300 p-0.5 text-xs font-semibold">
              {(["existing", "new"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1 ${
                    mode === m ? "bg-brand text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {m === "existing" ? "Existing customer" : "New customer"}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "existing" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customerId" className="text-sm font-medium text-zinc-700">
              Select customer
            </label>
            <select
              id="customerId"
              name="customerId"
              defaultValue={preselectedCustomerId ?? ""}
              required
              className={inputClass}
            >
              <option value="" disabled>
                Choose…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone" name="phone" type="tel" />
            </div>
            <Field label="Company name" name="companyName" placeholder="Optional" />
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Job address</p>
            <Field label="Address" name="addressLine1" required />
            <Field label="Unit" name="addressLine2" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City" name="city" required />
              <Field label="State" name="state" required />
              <Field label="Zip" name="zip" required />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">Job details</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="jobNotes" className="text-sm font-medium text-zinc-700">
            What needs to be done?
          </label>
          <textarea
            id="jobNotes"
            name="jobNotes"
            rows={4}
            placeholder="e.g. Garage cleanout, couch and two mattresses from the basement, gate code 1234…"
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Creating…" : "Create estimate"}
        </button>
        <p className="mt-2 text-xs text-zinc-400">
          Next you&apos;ll add line items, then send the customer a link to sign and approve.
        </p>
      </div>
    </form>
  );
}
