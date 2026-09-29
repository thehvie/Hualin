"use client";

import { useState, useTransition } from "react";
import { createVendor } from "./actions";
import { US_STATES } from "@/lib/purchase-orders";

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Input({ name, placeholder, type = "text", required }: { name: string; placeholder: string; type?: string; required?: boolean }) {
  return <input name={name} type={type} placeholder={placeholder} required={required} className={inputClass} />;
}

/** Slide-over used from the Vendors tab and from inside the PO wizard. */
export function VendorSlideOver({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (vendor: { id: string; name: string; contactName: string | null; phone: string | null; email: string | null }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createVendor(fd);
      if (!res.ok) return setError(res.error);
      onCreated(res.vendor);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/30">
      <form action={handleSubmit} className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-bold text-zinc-900">Create new vendor</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          <Input name="name" placeholder="Vendor name" required />
          <Input name="addressLine1" placeholder="Address" />
          <div className="grid grid-cols-[1fr_90px_100px] gap-2">
            <Input name="city" placeholder="City" />
            <select name="state" defaultValue="" className={inputClass}>
              <option value="">State</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Input name="zip" placeholder="Zip code" />
          </div>

          <p className="mt-2 text-sm font-semibold text-zinc-900">Contact details</p>
          <div className="grid grid-cols-[1fr_110px] gap-2">
            <Input name="phone" placeholder="Phone number" type="tel" />
            <Input name="phoneExt" placeholder="Ext (optional)" />
          </div>
          <Input name="secondaryPhone" placeholder="Secondary phone (optional)" type="tel" />
          <Input name="email" placeholder="Vendor email" type="email" />
          <Input name="secondaryEmail" placeholder="Secondary email (optional)" type="email" />
          <Input name="contactName" placeholder="Contact person name" />
          <Input name="contactTitle" placeholder="Contact person job title" />

          <p className="mt-2 text-sm font-semibold text-zinc-900">Payment terms</p>
          <Input name="paymentTerms" placeholder="e.g. Net 30" />

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {isPending ? "Creating…" : "Create vendor"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function NewVendorButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + New vendor
      </button>
      {open && <VendorSlideOver onClose={() => setOpen(false)} onCreated={() => setOpen(false)} />}
    </>
  );
}
