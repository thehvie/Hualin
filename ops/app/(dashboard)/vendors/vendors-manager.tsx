"use client";

import { useState, useTransition } from "react";
import { formatCents } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { createPartner, deleteRate, saveRate, setPartner, setVendorPaid, updatePartner, type PartnerInput, type RateInput } from "./actions";

export interface VendorRateRow {
  id: string;
  size: string;
  costCents: number;
  sellCents: number;
  packageDays: number | null;
  includedTons: number | null;
  extraDayCents: number | null;
  overageCentsPerTon: number | null;
  notes: string | null;
  inventory: number | null;
  inventoryUpdatedAt: string | null;
}

export interface PartnerVendor {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  serviceAreas: string | null;
  paymentTerms: string | null;
  partnerNotes: string | null;
  ourRatePercent: number | null;
  jobs: VendorJob[];
  rates: VendorRateRow[];
}

export interface VendorJob {
  id: string;
  customer: string;
  size: string | null;
  status: string;
  startAt: string;
  costCents: number | null;
  paid: boolean;
}

export interface Lookup {
  size: string;
  ownPriceCents: number | null;
  ownCostCents: number | null;
  vendors: { vendorId: string; vendorName: string; costCents: number; sellCents: number; inventory: number | null }[];
}

const input =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const btn = "rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50";
const ghost = "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50";

const dollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));
const margin = (sell: number, cost: number) => (sell > 0 ? Math.round(((sell - cost) / sell) * 100) : 0);

const blankPartner: PartnerInput = { name: "", contactName: "", phone: "", email: "", serviceAreas: "", paymentTerms: "", partnerNotes: "", ourRatePercent: "" };
const blankRate: RateInput = { size: "", cost: "", sell: "", packageDays: "", includedTons: "", extraDay: "", overagePerTon: "", notes: "", inventory: "" };

function PartnerForm({
  initial,
  submitLabel,
  pending,
  error,
  onSave,
  onCancel,
}: {
  initial: PartnerInput;
  submitLabel: string;
  pending: boolean;
  error: string | null;
  onSave: (v: PartnerInput) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState(initial);
  const set = (k: keyof PartnerInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={v.name} onChange={set("name")} placeholder="Company name" className={input} />
        <input value={v.contactName} onChange={set("contactName")} placeholder="Contact person" className={input} />
        <input value={v.phone} onChange={set("phone")} placeholder="Phone" inputMode="tel" className={input} />
        <input value={v.email} onChange={set("email")} placeholder="Email" className={input} />
        <input value={v.paymentTerms} onChange={set("paymentTerms")} placeholder="Payment terms (e.g. Net 15)" className={input} />
        <input value={v.ourRatePercent} onChange={set("ourRatePercent")} placeholder="Our rate % (our cut of the price)" inputMode="decimal" className={input} />
      </div>
      <textarea value={v.serviceAreas} onChange={set("serviceAreas")} placeholder="Where they deliver (cities or zip codes)" rows={2} className={input} />
      <textarea value={v.partnerNotes} onChange={set("partnerNotes")} placeholder="Notes: lead time, what they won't take, how to order" rows={2} className={input} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSave(v)} disabled={pending} className={btn}>
          {pending ? "Saving…" : submitLabel}
        </button>
        <button onClick={onCancel} disabled={pending} className={ghost}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RatesEditor({ vendor }: { vendor: PartnerVendor }) {
  const [adding, setAdding] = useState(false);
  const [r, setR] = useState<RateInput>(blankRate);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof RateInput) => (e: React.ChangeEvent<HTMLInputElement>) => setR({ ...r, [k]: e.target.value });

  function edit(row: VendorRateRow) {
    setR({
      size: row.size,
      cost: dollars(row.costCents),
      sell: dollars(row.sellCents),
      packageDays: row.packageDays?.toString() ?? "",
      includedTons: row.includedTons?.toString() ?? "",
      extraDay: dollars(row.extraDayCents),
      overagePerTon: dollars(row.overageCentsPerTon),
      notes: row.notes ?? "",
      inventory: row.inventory?.toString() ?? "",
    });
    setError(null);
    setAdding(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveRate(vendor.id, r);
      if (!res.ok) return setError(res.error);
      setR(blankRate);
      setAdding(false);
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this size from the vendor?")) return;
    startTransition(async () => {
      await deleteRate(id);
    });
  }

  return (
    <div className="mt-3">
      {vendor.rates.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Size</th>
                <th className="py-2 pr-3 text-right">They charge</th>
                <th className="py-2 pr-3 text-right">You charge</th>
                <th className="py-2 pr-3 text-right">Margin</th>
                <th className="py-2 pr-3 text-right">In stock</th>
                <th className="py-2 pr-3">Package</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {vendor.rates.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="py-2 pr-3 font-medium text-zinc-900">{row.size}</td>
                  <td className="py-2 pr-3 text-right text-zinc-700">{formatCents(row.costCents)}</td>
                  <td className="py-2 pr-3 text-right text-zinc-900">{formatCents(row.sellCents)}</td>
                  <td className="py-2 pr-3 text-right text-zinc-700">
                    {formatCents(row.sellCents - row.costCents)} ({margin(row.sellCents, row.costCents)}%)
                  </td>
                  <td className="py-2 pr-3 text-right text-zinc-700">
                    {row.inventory != null ? row.inventory : "—"}
                    {row.inventoryUpdatedAt && <span className="block text-[10px] text-zinc-400">as of {new Date(row.inventoryUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </td>
                  <td className="py-2 pr-3 text-xs text-zinc-500">
                    {[row.packageDays ? `${row.packageDays} days` : null, row.includedTons ? `${row.includedTons} tons` : null, row.extraDayCents != null ? `${formatCents(row.extraDayCents)}/extra day` : null, row.overageCentsPerTon != null ? `${formatCents(row.overageCentsPerTon)}/ton over` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="py-2 text-right text-xs">
                    <button onClick={() => edit(row)} className="mr-3 font-medium text-zinc-600 hover:text-zinc-900">
                      Edit
                    </button>
                    <button onClick={() => remove(row.id)} disabled={pending} className="font-medium text-red-600 hover:text-red-800">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !adding && <p className="text-sm text-zinc-500">No sizes yet. Add what this vendor charges you for each size.</p>
      )}

      {adding ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg bg-zinc-50 p-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <input value={r.size} onChange={set("size")} placeholder="Size (20 yd)" className={input} />
            <input value={r.cost} onChange={set("cost")} placeholder="They charge $" inputMode="decimal" className={input} />
            <input value={r.sell} onChange={set("sell")} placeholder={vendor.ourRatePercent != null ? `You charge $ (auto at ${vendor.ourRatePercent}%)` : "You charge $"} inputMode="decimal" className={input} />
            <input value={r.inventory} onChange={set("inventory")} placeholder="How many they have" inputMode="numeric" className={input} />
            <input value={r.packageDays} onChange={set("packageDays")} placeholder="Days included" inputMode="numeric" className={input} />
            <input value={r.includedTons} onChange={set("includedTons")} placeholder="Tons included" inputMode="decimal" className={input} />
            <input value={r.extraDay} onChange={set("extraDay")} placeholder="Their extra day $" inputMode="decimal" className={input} />
            <input value={r.overagePerTon} onChange={set("overagePerTon")} placeholder="Their $/ton over" inputMode="decimal" className={input} />
            <input value={r.notes} onChange={set("notes")} placeholder="Notes" className={input} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={pending} className={btn}>
              {pending ? "Saving…" : "Save size"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setR(blankRate);
                setError(null);
              }}
              className={ghost}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className={`${ghost} mt-3`}>
          + Add size
        </button>
      )}
    </div>
  );
}

function PartnerCard({ vendor }: { vendor: PartnerVendor }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <PartnerForm
        initial={{
          name: vendor.name,
          contactName: vendor.contactName ?? "",
          phone: formatPhone(vendor.phone),
          email: vendor.email ?? "",
          serviceAreas: vendor.serviceAreas ?? "",
          paymentTerms: vendor.paymentTerms ?? "",
          partnerNotes: vendor.partnerNotes ?? "",
          ourRatePercent: vendor.ourRatePercent?.toString() ?? "",
        }}
        submitLabel="Save"
        pending={pending}
        error={error}
        onCancel={() => setEditing(false)}
        onSave={(v) =>
          startTransition(async () => {
            setError(null);
            const res = await updatePartner(vendor.id, v);
            if (!res.ok) setError(res.error);
            else setEditing(false);
          })
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">{vendor.name}</p>
          <p className="text-sm text-zinc-600">
            {[vendor.contactName, formatPhone(vendor.phone), vendor.email].filter(Boolean).join(" · ") || "No contact details"}
          </p>
          {vendor.serviceAreas && <p className="mt-1 text-xs text-zinc-500">Delivers: {vendor.serviceAreas}</p>}
          {vendor.paymentTerms && <p className="text-xs text-zinc-500">Terms: {vendor.paymentTerms}</p>}
          {vendor.ourRatePercent != null && <p className="text-xs font-medium text-zinc-700">Our rate: {vendor.ourRatePercent}% of the customer price</p>}
          {vendor.partnerNotes && <p className="mt-1 text-xs text-zinc-500">{vendor.partnerNotes}</p>}
        </div>
        <div className="flex gap-3 text-xs">
          <button onClick={() => setEditing(true)} className="font-medium text-zinc-600 hover:text-zinc-900">
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Take ${vendor.name} off your dumpster partners? Its rates are kept.`)) startTransition(async () => void (await setPartner(vendor.id, false)));
            }}
            disabled={pending}
            className="font-medium text-red-600 hover:text-red-800"
          >
            Remove as partner
          </button>
        </div>
      </div>
      <RatesEditor vendor={vendor} />
      <JobsOwed vendor={vendor} />
    </div>
  );
}

/** Rentals this vendor has filled for us, and what we still owe them. A rental counts as owed once it's on site. */
function JobsOwed({ vendor }: { vendor: PartnerVendor }) {
  const [pending, startTransition] = useTransition();
  if (vendor.jobs.length === 0) return null;
  const delivered = (s: string) => s === "DELIVERED" || s === "PICKUP_REQUESTED" || s === "PICKED_UP";
  const owed = vendor.jobs.filter((j) => delivered(j.status) && !j.paid).reduce((s, j) => s + (j.costCents ?? 0), 0);
  return (
    <div className="mt-4 border-t border-zinc-100 pt-3">
      <p className="text-sm font-semibold text-zinc-900">
        Rentals they filled <span className="ml-2 font-normal text-zinc-500">We owe {formatCents(owed)}</span>
      </p>
      <ul className="mt-2 divide-y divide-zinc-100 text-sm">
        {vendor.jobs.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-1.5">
            <span className="font-medium text-zinc-900">{j.customer}</span>
            <span className="text-zinc-600">{j.size ?? "Dumpster"}</span>
            <span className="text-xs text-zinc-500">{new Date(j.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {j.status === "RESERVED" ? "Scheduled" : j.status === "PICKED_UP" ? "Picked up" : "On site"}</span>
            <span className="ml-auto text-zinc-700">{j.costCents != null ? formatCents(j.costCents) : "No cost"}</span>
            <button
              disabled={pending}
              onClick={() => startTransition(async () => void (await setVendorPaid(j.id, !j.paid)))}
              className={`text-xs font-semibold ${j.paid ? "text-emerald-700" : "text-brand hover:underline"}`}
            >
              {j.paid ? "Paid ✓ (undo)" : "Mark paid"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VendorsManager({ partners, others, lookup }: { partners: PartnerVendor[]; others: { id: string; name: string }[]; lookup: Lookup[] }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [promote, setPromote] = useState("");

  return (
    <>
      {lookup.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-zinc-900">Price lookup by size</p>
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-2 pr-3">Size</th>
                <th className="py-2 pr-3">Your own dumpster</th>
                <th className="py-2">Partner vendors (their cost → your price)</th>
              </tr>
            </thead>
            <tbody>
              {lookup.map((l) => (
                <tr key={l.size} className="border-t border-zinc-100 align-top">
                  <td className="py-2 pr-3 font-medium text-zinc-900">{l.size}</td>
                  <td className="py-2 pr-3 text-zinc-700">
                    {l.ownPriceCents != null ? (
                      <>
                        {formatCents(l.ownPriceCents)}
                        {l.ownCostCents != null && <span className="text-xs text-zinc-500"> (cost {formatCents(l.ownCostCents)})</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 text-zinc-700">
                    {l.vendors.length === 0
                      ? "—"
                      : l.vendors.map((v) => (
                          <p key={v.vendorId}>
                            {v.vendorName}: {formatCents(v.costCents)} → <span className="font-medium text-zinc-900">{formatCents(v.sellCents)}</span>{" "}
                            <span className="text-xs text-zinc-500">({margin(v.sellCents, v.costCents)}% margin{v.inventory != null ? `, ${v.inventory} in stock` : ""})</span>
                          </p>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {partners.map((p) => (
        <PartnerCard key={p.id} vendor={p} />
      ))}
      {partners.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No dumpster partners yet. Add a vendor to start building rate sheets.
        </div>
      )}

      {adding ? (
        <PartnerForm
          initial={blankPartner}
          submitLabel="Add vendor"
          pending={pending}
          error={error}
          onCancel={() => setAdding(false)}
          onSave={(v) =>
            startTransition(async () => {
              setError(null);
              const res = await createPartner(v);
              if (!res.ok) setError(res.error);
              else setAdding(false);
            })
          }
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setAdding(true)} className={btn}>
            + Add vendor
          </button>
          {others.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={promote} onChange={(e) => setPromote(e.target.value)} className={input}>
                <option value="">Use an existing vendor…</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                disabled={!promote || pending}
                onClick={() =>
                  startTransition(async () => {
                    await setPartner(promote, true);
                    setPromote("");
                  })
                }
                className={ghost}
              >
                Add as partner
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
