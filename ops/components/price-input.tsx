"use client";

import { useState } from "react";

/** A dollar amount you can type over on an item row; saves when you leave the field, and reverts if it isn't a number. */
export function PriceInput({
  cents,
  perDay,
  disabled,
  onSave,
}: {
  cents: number;
  perDay?: boolean;
  disabled?: boolean;
  onSave: (cents: number) => void;
}) {
  const fmt = (c: number) => (c / 100).toFixed(2);
  const [value, setValue] = useState(fmt(cents));
  const [lastCents, setLastCents] = useState(cents);
  // Follow the saved value when the server sends a new one.
  if (cents !== lastCents) {
    setLastCents(cents);
    setValue(fmt(cents));
  }

  function commit() {
    const next = Math.round(parseFloat(value) * 100);
    if (!Number.isFinite(next) || next < 0 || next > 100_000_000) {
      setValue(fmt(cents));
      return;
    }
    setValue(fmt(next));
    if (next !== cents) onSave(next);
  }

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <span className="text-zinc-500">$</span>
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        aria-label="Price"
        className="w-24 rounded border border-zinc-200 px-1.5 py-1 text-right text-sm text-zinc-900 outline-none focus:border-brand"
      />
      {perDay && <span className="text-xs text-zinc-500">/day</span>}
    </span>
  );
}
