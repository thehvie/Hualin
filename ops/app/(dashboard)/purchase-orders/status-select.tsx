"use client";

import { useTransition } from "react";
import { updatePurchaseOrderStatus, setVendorActive } from "./actions";
import { PO_STATUS_LABELS } from "@/lib/purchase-orders";

export function PoStatusSelect({ poId, status }: { poId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <select
      key={status}
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updatePurchaseOrderStatus(poId, e.target.value))}
      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm font-medium text-zinc-900 outline-none focus:border-brand"
    >
      {Object.entries(PO_STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function VendorActiveToggle({ vendorId, active }: { vendorId: string; active: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => setVendorActive(vendorId, !active))}
      className="text-xs font-semibold text-zinc-500 hover:text-brand"
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
