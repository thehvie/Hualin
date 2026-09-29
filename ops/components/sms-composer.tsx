"use client";

import { useState, useTransition } from "react";
import { sendCustomerSms } from "@/app/(dashboard)/sms-actions";

/** Small "text the customer" box shown under the Conversation panel. */
export function SmsComposer({
  customerId,
  customerName,
  hasPhone,
  estimateId,
  invoiceId,
}: {
  customerId: string;
  customerName: string;
  hasPhone: boolean;
  estimateId?: string;
  invoiceId?: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!hasPhone) {
    return <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">Add a phone number to text {customerName}.</p>;
  }

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendCustomerSms({ customerId, body, estimateId, invoiceId });
      if (!res.ok) return setError(res.error);
      setBody("");
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={600}
        placeholder={`Text ${customerName}…`}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={send}
          disabled={isPending || !body.trim()}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send text"}
        </button>
      </div>
    </div>
  );
}
