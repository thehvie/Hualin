"use client";

import { useState, useTransition } from "react";
import { createPriceBookItem, updatePriceBookItem, deletePriceBookItem } from "./actions";

export interface PriceBookItemData {
  id: string;
  number: number;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  modelNumber: string | null;
  unitPriceCents: number;
  costCents: number | null;
  bookable: boolean;
  bookingPriceCents: number | null;
  active: boolean;
}

function centsToStr(cents: number | null | undefined) {
  return cents != null ? (cents / 100).toFixed(2) : "";
}

export function AddItemButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + Add New
      </button>
      {open && <ItemModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditItemTrigger({ item, children }: { item: PriceBookItemData; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full text-left">
        {children}
      </button>
      {open && <ItemModal item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function ItemModal({ item, onClose }: { item?: PriceBookItemData; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [bookable, setBookable] = useState(item?.bookable ?? false);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      if (item) {
        await updatePriceBookItem(item.id, fd);
      } else {
        await createPriceBookItem(fd);
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!item) return;
    if (!confirm(`Delete "${item.name}" from the Price Book? This can't be undone.`)) return;
    startTransition(async () => {
      await deletePriceBookItem(item.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{item ? "Edit Item" : "Add New Item"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">
            ✕
          </button>
        </div>

        <form action={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Title" name="name" defaultValue={item?.name} required />
            <Field label="Model #" name="modelNumber" defaultValue={item?.modelNumber ?? ""} />
            <Field label="Category" name="category" defaultValue={item?.category ?? ""} placeholder="Optional" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Item type</label>
              <select
                name="type"
                defaultValue={item?.type ?? "SERVICE"}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              >
                <option value="SERVICE">Service</option>
                <option value="MATERIAL">Product</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Item description</label>
              <textarea
                name="description"
                defaultValue={item?.description ?? ""}
                rows={4}
                placeholder="Optional"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Field label="Price" name="unitPrice" type="number" step="0.01" defaultValue={centsToStr(item?.unitPriceCents ?? 0)} />
            <Field label="Unit cost" name="cost" type="number" step="0.01" defaultValue={centsToStr(item?.costCents)} placeholder="Optional" />

            <label className="flex items-center justify-between text-sm font-medium text-zinc-700">
              Active item
              <Toggle name="active" defaultChecked={item?.active ?? true} />
            </label>

            <label className="flex items-center justify-between text-sm font-medium text-zinc-700">
              Add to booking items
              <Toggle
                name="bookable"
                defaultChecked={bookable}
                onChange={(checked) => setBookable(checked)}
              />
            </label>
            {bookable && (
              <Field
                label="Booking price"
                name="bookingPrice"
                type="number"
                step="0.01"
                defaultValue={centsToStr(item?.bookingPriceCents)}
                placeholder="Defaults to Price if left blank"
              />
            )}

            {item && (
              <button
                type="button"
                disabled={isPending}
                onClick={handleDelete}
                className="mt-2 self-start text-sm font-medium text-red-500 hover:text-red-700"
              >
                Delete Item
              </button>
            )}
          </div>

          <div className="col-span-full mt-2 flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  step,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </div>
  );
}

function Toggle({
  name,
  defaultChecked,
  onChange,
}: {
  name: string;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <span className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span className="h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-brand" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
    </span>
  );
}
