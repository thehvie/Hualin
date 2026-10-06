"use client";

import { formatCents } from "@/lib/money";
import { formatUnitPrice } from "@/lib/price-book";

export interface ItemMatch {
  priceBookItemId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  isRental: boolean;
}

export interface ItemRow extends ItemMatch {
  checked: boolean;
}

/** Review list for price book items matched from a voice recording: tick, adjust quantity, see totals. */
export function VoiceItemList({
  rows,
  unmatched,
  onChange,
}: {
  rows: ItemRow[];
  unmatched: string[];
  onChange: (rows: ItemRow[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing in your price book matched what was said.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li key={r.priceBookItemId} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <input
                type="checkbox"
                checked={r.checked}
                onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))}
              />
              <span className="min-w-32 flex-1 text-zinc-900">{r.name}</span>
              <input
                type="number"
                min={1}
                value={r.quantity}
                onChange={(e) =>
                  onChange(rows.map((x, j) => (j === i ? { ...x, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : x)))
                }
                className="w-16 rounded-lg border border-zinc-300 px-2 py-1 text-right"
              />
              <span className="w-28 text-right text-zinc-600">× {formatUnitPrice(formatCents(r.unitPriceCents), r.isRental)}</span>
              <span className="w-24 text-right font-medium text-zinc-900">{formatCents(r.quantity * r.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
      )}
      {unmatched.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
          Not in your price book, so not added: {unmatched.join(", ")}. Add them with Custom item.
        </p>
      )}
    </div>
  );
}
