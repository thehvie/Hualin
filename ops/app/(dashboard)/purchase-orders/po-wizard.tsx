"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "./actions";
import { VendorSlideOver } from "./vendor-form";
import { formatCents } from "@/lib/money";
import { US_STATES } from "@/lib/purchase-orders";

export interface VendorOption {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  costCents: number;
}

export interface JobOption {
  id: string;
  label: string;
}

interface Row {
  key: number;
  name: string;
  cost: string;
  quantity: number;
  jobId: string;
}

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function NewPurchaseOrderButton({
  vendors,
  catalog,
  jobs,
}: {
  vendors: VendorOption[];
  catalog: CatalogItem[];
  jobs: JobOption[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + New purchase order
      </button>
      {open && <PurchaseOrderWizard vendors={vendors} catalog={catalog} jobs={jobs} onClose={() => setOpen(false)} />}
    </>
  );
}

function PurchaseOrderWizard({
  vendors: initialVendors,
  catalog,
  jobs,
  onClose,
}: {
  vendors: VendorOption[];
  catalog: CatalogItem[];
  jobs: JobOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [vendors, setVendors] = useState(initialVendors);
  const [showVendorForm, setShowVendorForm] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(todayStr());
  const [rows, setRows] = useState<Row[]>([]);
  const nextKey = useRef(1);

  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [expectedDate, setExpectedDate] = useState(todayStr());
  const [address, setAddress] = useState({ line1: "", city: "", state: "", zip: "" });
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const vendor = vendors.find((v) => v.id === vendorId) ?? null;
  const total = rows.reduce((sum, r) => sum + Math.round(parseFloat(r.cost || "0") * 100) * r.quantity, 0);

  function addRow(catalogId: string) {
    if (!catalogId) return;
    const item = catalogId === "__custom" ? null : catalog.find((c) => c.id === catalogId);
    setRows((prev) => [
      ...prev,
      {
        key: nextKey.current++,
        name: item?.name ?? "",
        cost: item ? (item.costCents / 100).toFixed(2) : "",
        quantity: 1,
        jobId: "",
      },
    ]);
  }

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function goNext() {
    setError(null);
    if (!vendorId) return setError("Please choose a vendor.");
    if (rows.length === 0 || rows.some((r) => !r.name.trim())) return setError("Add at least one item, and give every item a name.");
    setStep(2);
  }

  function submit(intent: "draft" | "send") {
    setError(null);
    const fd = new FormData();
    fd.set("vendorId", vendorId);
    fd.set("orderDate", orderDate);
    fd.set("fulfillment", fulfillment);
    fd.set("expectedDate", expectedDate);
    fd.set("deliveryAddressLine1", address.line1);
    fd.set("deliveryCity", address.city);
    fd.set("deliveryState", address.state);
    fd.set("deliveryZip", address.zip);
    fd.set("notes", notes);
    fd.set("intent", intent);
    fd.set(
      "items",
      JSON.stringify(rows.map((r) => ({ name: r.name, cost: r.cost, quantity: r.quantity, jobId: r.jobId || null }))),
    );
    files.forEach((f) => fd.append("attachments", f));
    startTransition(async () => {
      const res = await createPurchaseOrder(fd);
      if (!res.ok) return setError(res.error);
      onClose();
      router.push(`/purchase-orders/${res.id}${res.emailNote ? `?note=${encodeURIComponent(res.emailNote)}` : ""}`);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="px-6 pt-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-brand" />
            <div className={`h-1.5 flex-1 rounded-full ${step === 2 ? "bg-brand" : "bg-brand/20"}`} />
            <button onClick={onClose} className="ml-2 text-zinc-400 hover:text-zinc-700">
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-zinc-900">Create purchase order</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 ? (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-900">Vendor</label>
                  <select
                    value={vendorId}
                    onChange={(e) => {
                      if (e.target.value === "__new") return setShowVendorForm(true);
                      setVendorId(e.target.value);
                    }}
                    className={inputClass}
                  >
                    <option value="">Select vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                    <option value="__new">+ Create new vendor…</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-900">Order date</label>
                  <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputClass} />
                </div>
              </div>

              <select
                value=""
                onChange={(e) => addRow(e.target.value)}
                className={`${inputClass} border-zinc-800`}
              >
                <option value="">Add items</option>
                <option value="__custom">+ Custom item</option>
                {catalog.length > 0 && (
                  <optgroup label="From your price book">
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                      <th className="px-3 py-2.5">Item name</th>
                      <th className="px-3 py-2.5">Cost</th>
                      <th className="px-3 py-2.5">Quantity</th>
                      <th className="px-3 py-2.5">For job</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-sm text-zinc-400">
                          No items yet — use “Add items” above.
                        </td>
                      </tr>
                    )}
                    {rows.map((r) => (
                      <tr key={r.key}>
                        <td className="px-3 py-2">
                          <input
                            value={r.name}
                            onChange={(e) => updateRow(r.key, { name: e.target.value })}
                            placeholder="Item name"
                            className="w-full min-w-[140px] rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={r.cost}
                            onChange={(e) => updateRow(r.key, { cost: e.target.value })}
                            className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={r.quantity}
                            onChange={(e) => updateRow(r.key, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                            className="w-20 rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={r.jobId}
                            onChange={(e) => updateRow(r.key, { jobId: e.target.value })}
                            className="w-full min-w-[160px] rounded border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand"
                          >
                            <option value="">— none —</option>
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>
                                {j.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2">
                          <button
                            onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Remove item"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Vendor</p>
                  <p className="mt-1 text-sm text-zinc-600">{vendor?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Order summary</p>
                  <p className="mt-1 text-sm text-zinc-600">No. of items: {rows.length}</p>
                  <p className="text-sm text-zinc-600">Total: {formatCents(total)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Contact</p>
                  <p className="mt-1 text-sm text-zinc-600">{vendor?.contactName || "—"}</p>
                  {vendor?.phone && <p className="text-sm text-brand">{vendor.phone}</p>}
                  <p className="text-sm text-zinc-600">{vendor?.email || "No email on file"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-zinc-900">Order preference</p>
                  <div className="flex gap-5 text-sm text-zinc-700">
                    {(["DELIVERY", "PICKUP"] as const).map((f) => (
                      <label key={f} className="flex items-center gap-2">
                        <input type="radio" checked={fulfillment === f} onChange={() => setFulfillment(f)} />
                        {f === "DELIVERY" ? "Delivery" : "Pickup"}
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-500">
                      Est. {fulfillment === "DELIVERY" ? "delivery" : "pickup"} date
                    </label>
                    <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputClass} />
                  </div>
                  {fulfillment === "DELIVERY" && (
                    <>
                      <p className="text-xs text-zinc-500">Delivery location: the address where you would like to receive the order.</p>
                      <input
                        placeholder="Address"
                        value={address.line1}
                        onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                        className={inputClass}
                      />
                      <div className="grid grid-cols-[1fr_80px_90px] gap-2">
                        <input
                          placeholder="City"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          className={inputClass}
                        />
                        <select
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">State</option>
                          {US_STATES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Zip"
                          value={address.zip}
                          onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-zinc-900">Notes</label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type here…"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-zinc-900">Attachments</label>
                    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-brand/40 bg-brand/5 px-4 py-5 text-center hover:bg-brand/10">
                      <span className="text-sm font-semibold text-brand-dark">Upload files here</span>
                      <span className="text-xs text-zinc-500">Up to 5 PDF, JPEG or PNG files, 5MB each</span>
                      <input
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))}
                      />
                    </label>
                    {files.length > 0 && (
                      <ul className="text-xs text-zinc-600">
                        {files.map((f) => (
                          <li key={f.name}>📎 {f.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4">
          <p className="text-base font-bold text-zinc-900">Total: {formatCents(total)}</p>
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
                Back
              </button>
            )}
            {step === 1 ? (
              <>
                <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
                  Cancel
                </button>
                <button onClick={goNext} className="rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  Next
                </button>
              </>
            ) : (
              <>
                <button
                  disabled={isPending}
                  onClick={() => submit("draft")}
                  className="rounded-full border border-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Save and close
                </button>
                <button
                  disabled={isPending}
                  onClick={() => submit("send")}
                  className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Save and send"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showVendorForm && (
        <VendorSlideOver
          onClose={() => setShowVendorForm(false)}
          onCreated={(v) => {
            setVendors((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
            setVendorId(v.id);
            setShowVendorForm(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
