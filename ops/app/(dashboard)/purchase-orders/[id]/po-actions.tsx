"use client";

import { useState, useTransition } from "react";
import { sendPurchaseOrder, deletePurchaseOrder } from "../actions";

export function PoActions({
  poId,
  status,
  hasVendorEmail,
  initialNote,
}: {
  poId: string;
  status: string;
  hasVendorEmail: boolean;
  initialNote: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(initialNote);

  function handleSend() {
    if (!hasVendorEmail) return setNotice("This vendor has no email address on file.");
    startTransition(async () => {
      const res = await sendPurchaseOrder(poId);
      setNotice(res.ok ? "Purchase order emailed to the vendor." : (res.error ?? "Could not send."));
    });
  }

  function handleDelete() {
    if (!confirm("Delete this purchase order? This can't be undone.")) return;
    startTransition(() => deletePurchaseOrder(poId));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {(status === "DRAFT" || status === "SENT") && (
          <button
            disabled={isPending}
            onClick={handleSend}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {status === "SENT" ? "Resend to vendor" : "Send to vendor"}
          </button>
        )}
        {(status === "DRAFT" || status === "CANCELLED") && (
          <button
            disabled={isPending}
            onClick={handleDelete}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
