"use client";

import { useState, useTransition } from "react";
import { clearDepositPaid, recordDepositPaid } from "@/app/(dashboard)/estimates/[id]/actions";
import { formatCents } from "@/lib/money";

const METHODS = [
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "ACH", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];
const METHOD_LABEL = Object.fromEntries(METHODS.map((m) => [m.value, m.label]));

const field = "rounded-lg border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

/** Under the Deposit row: mark the deposit as received (so the balance is right) or undo it. */
export function DepositPaid({
  estimateId,
  requestedCents,
  paidCents,
  paidAt,
  method,
  hasInvoice,
}: {
  estimateId: string;
  requestedCents: number;
  paidCents: number;
  paidAt: string | null;
  method: string | null;
  hasInvoice: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((requestedCents / 100).toFixed(2));
  const [methodValue, setMethodValue] = useState("CARD");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else after?.();
    });

  if (paidCents > 0) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        <span>
          ✓ Deposit received: {formatCents(paidCents)}
          {method ? ` by ${METHOD_LABEL[method] ?? method}` : ""}
          {paidAt ? ` on ${new Date(paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
        </span>
        {!hasInvoice && (
          <button type="button" disabled={pending} onClick={() => run(() => clearDepositPaid(estimateId))} className="font-medium text-emerald-800 hover:underline disabled:opacity-50">
            Undo
          </button>
        )}
      </div>
    );
  }

  // Once an invoice exists, payments are recorded on the invoice instead.
  if (hasInvoice) return null;
  if (requestedCents <= 0 && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-fit text-xs font-medium text-brand hover:underline">
        Record a deposit received
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="w-fit text-xs font-medium text-brand hover:underline">
          Mark deposit as paid
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Amount received
              <input className={field} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              How paid
              <select className={field} value={methodValue} onChange={(e) => setMethodValue(e.target.value)}>
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input className={field} placeholder="Reference, like a check number (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => recordDepositPaid(estimateId, { amount, method: methodValue, reference }), () => setOpen(false))}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save deposit"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
