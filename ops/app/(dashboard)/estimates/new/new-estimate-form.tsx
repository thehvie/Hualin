"use client";

import { useMemo, useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { formatUnitPrice } from "@/lib/price-book";
import { PhotoDropzone } from "@/components/photo-dropzone";
import { US_STATES } from "@/lib/us-states";
import { createEstimateFromBuilder, type BuilderItem } from "../actions";

interface CustomerOption {
  id: string;
  label: string;
  detail: string;
}

interface PriceBookOption {
  id: string;
  name: string;
  unitPriceCents: number;
  costCents: number | null;
  isRental: boolean;
}

interface DraftItem extends BuilderItem {
  key: number;
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

export function NewEstimateForm({
  customers,
  priceBookItems,
  preselectedCustomerId,
  defaultState,
}: {
  customers: CustomerOption[];
  priceBookItems: PriceBookOption[];
  preselectedCustomerId: string | null;
  defaultState: string | null;
}) {
  const [mode, setMode] = useState<"new" | "existing">(
    preselectedCustomerId || customers.length > 0 ? "existing" : "new",
  );
  const [customerId, setCustomerId] = useState<string | null>(preselectedCustomerId);
  const [query, setQuery] = useState("");
  const [nc, setNc] = useState({
    firstName: "", lastName: "", companyName: "", email: "", phone: "",
    addressLine1: "", addressLine2: "", city: "", state: defaultState ?? "", zip: "",
  });
  const [jobNotes, setJobNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [showPriceBook, setShowPriceBook] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState({ description: "", quantity: "1", price: "", cost: "", isRental: false });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? customers.filter((c) => `${c.label} ${c.detail}`.toLowerCase().includes(q)) : customers;
    return list.slice(0, 8);
  }, [customers, query]);

  const subtotalCents = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);

  function addItem(item: BuilderItem) {
    setItems((prev) => [...prev, { ...item, key: nextKey }]);
    setNextKey((k) => k + 1);
  }

  function addCustom() {
    const description = custom.description.trim();
    if (!description) return;
    addItem({
      priceBookItemId: null,
      description,
      quantity: Math.max(1, parseInt(custom.quantity, 10) || 1),
      unitPriceCents: Math.round(parseFloat(custom.price || "0") * 100) || 0,
      costCents: custom.cost ? Math.round(parseFloat(custom.cost) * 100) || 0 : null,
      isRental: custom.isRental,
    });
    setCustom({ description: "", quantity: "1", price: "", cost: "", isRental: false });
    setShowCustom(false);
  }

  function save() {
    setError(null);
    if (mode === "existing" && !customerId) return setError("Choose a customer, or switch to New customer.");
    if (mode === "new" && (!nc.firstName.trim() || !nc.lastName.trim()))
      return setError("Enter the customer's first and last name.");
    if (mode === "new" && (!nc.addressLine1.trim() || !nc.city.trim() || !nc.state))
      return setError("Enter the job address.");

    const photoData = new FormData();
    for (const photo of photos) photoData.append("photos", photo);

    startTransition(async () => {
      const res = await createEstimateFromBuilder({
        mode,
        customerId: customerId ?? undefined,
        customer: mode === "new" ? nc : undefined,
        jobNotes,
        items: items.map(({ key: _key, ...rest }) => rest),
      }, photoData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
      <div className="flex flex-col gap-6">
        {/* Customer */}
        <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Customer</h2>
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
          </div>

          {mode === "existing" ? (
            selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{selectedCustomer.label}</p>
                  {selectedCustomer.detail && <p className="text-xs text-zinc-500">{selectedCustomer.detail}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerId(null)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search customers by name, email or phone…"
                  className={inputClass}
                />
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
                        <button
                          type="button"
                          onClick={() => setCustomerId(c.id)}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-zinc-50"
                        >
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
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First name" required value={nc.firstName} onChange={(v) => setNc({ ...nc, firstName: v })} />
                <Field label="Last name" required value={nc.lastName} onChange={(v) => setNc({ ...nc, lastName: v })} />
                <Field label="Email" type="email" value={nc.email} onChange={(v) => setNc({ ...nc, email: v })} />
                <Field label="Phone" type="tel" value={nc.phone} onChange={(v) => setNc({ ...nc, phone: v })} />
              </div>
              <Field
                label="Company name"
                placeholder="Optional"
                value={nc.companyName}
                onChange={(v) => setNc({ ...nc, companyName: v })}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Job address</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <Field label="Address" required value={nc.addressLine1} onChange={(v) => setNc({ ...nc, addressLine1: v })} />
                <Field label="Unit" value={nc.addressLine2} onChange={(v) => setNc({ ...nc, addressLine2: v })} />
              </div>
              <div className={`grid grid-cols-1 gap-3 ${defaultState ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <Field label="City" required value={nc.city} onChange={(v) => setNc({ ...nc, city: v })} />
                {!defaultState && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">
                    State<span className="text-red-500"> *</span>
                  </label>
                  <select value={nc.state} onChange={(e) => setNc({ ...nc, state: e.target.value })} className={inputClass}>
                    <option value="">Select…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                )}
                <Field label="Zip" value={nc.zip} onChange={(v) => setNc({ ...nc, zip: v })} />
              </div>
              <p className="text-xs text-zinc-400">A new customer is saved to your Customers list when you save the estimate.</p>
            </>
          )}
        </div>

        {/* Job details */}
        <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Job details</h2>
          <textarea
            rows={3}
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
            placeholder="e.g. Garage cleanout, couch and two mattresses from the basement, gate code 1234…"
            className={inputClass}
          />
        </div>

        {/* Photos */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Photos</h2>
          <PhotoDropzone
            onFiles={(files) => setPhotos((prev) => [...prev, ...files].slice(0, 5))}
            disabled={photos.length >= 5}
          />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt={file.name} className="h-24 w-24 object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Items</h2>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <span className="text-2xl">🧾</span>
              <p className="text-sm text-zinc-400">Add items to start the tally</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Price</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((it) => (
                    <tr key={it.key}>
                      <td className="py-2.5 text-zinc-900">{it.description}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => {
                              const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                              setItems((prev) => prev.map((x) => (x.key === it.key ? { ...x, quantity: q } : x)));
                            }}
                            className="w-16 rounded border border-zinc-200 px-1.5 py-1 text-right text-sm text-zinc-900 outline-none focus:border-brand"
                          />
                          {it.isRental && <span className="text-xs text-zinc-500">{it.quantity === 1 ? "day" : "days"}</span>}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-zinc-900">
                        {formatUnitPrice(formatCents(it.unitPriceCents), it.isRental)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-zinc-900">
                        {formatCents(it.quantity * it.unitPriceCents)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                          className="text-xs font-medium text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCustom((v) => !v);
                setShowPriceBook(false);
              }}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              + Add item
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPriceBook((v) => !v);
                setShowCustom(false);
              }}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Price book
            </button>
          </div>

          {showPriceBook && (
            <div className="mt-3 rounded-lg border border-zinc-200">
              {priceBookItems.length === 0 ? (
                <p className="p-4 text-sm text-zinc-400">Your price book is empty — use Add item instead.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-zinc-100 overflow-y-auto">
                  {priceBookItems.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() =>
                          addItem({
                            priceBookItemId: p.id,
                            description: p.name,
                            quantity: 1,
                            unitPriceCents: p.unitPriceCents,
                            costCents: p.costCents,
                            isRental: p.isRental,
                          })
                        }
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-zinc-50"
                      >
                        <span className="text-zinc-900">{p.name}</span>
                        <span className="font-medium text-zinc-900">{formatCents(p.unitPriceCents)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showCustom && (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-zinc-200 p-3">
              <input
                autoFocus
                value={custom.description}
                onChange={(e) => setCustom({ ...custom, description: e.target.value })}
                placeholder="Item name"
                className={inputClass}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-zinc-500">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={custom.quantity}
                    onChange={(e) => setCustom({ ...custom, quantity: e.target.value })}
                    className={`mt-1 w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={custom.price}
                    onChange={(e) => setCustom({ ...custom, price: e.target.value })}
                    placeholder="0.00"
                    className={`mt-1 w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={custom.cost}
                    onChange={(e) => setCustom({ ...custom, cost: e.target.value })}
                    placeholder="Optional"
                    className={`mt-1 w-full ${inputClass}`}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={custom.isRental}
                  onChange={(e) => setCustom({ ...custom, isRental: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Rental — price is per day, quantity is the number of days
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addCustom}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Running tally */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6">
        <h2 className="text-sm font-semibold text-zinc-900">Estimate total</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Items</dt>
            <dd className="font-medium text-zinc-900">{items.length}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
            <dt>Total</dt>
            <dd>{formatCents(subtotalCents)}</dd>
          </div>
        </dl>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save estimate"}
        </button>
        <p className="text-xs text-zinc-400">
          Then you can add a deposit or discount, and send the customer a link to sign.
        </p>
      </div>
    </div>
  );
}
