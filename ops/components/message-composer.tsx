"use client";

import { useState, useTransition } from "react";
import { sendCustomerSms } from "@/app/(dashboard)/sms-actions";

/**
 * "Message the customer" box under the Conversation panel. Sends a text when
 * texting is set up for this customer, otherwise an email.
 */
export function MessageComposer({
  customerId,
  customerName,
  channel,
  estimateId,
  invoiceId,
}: {
  customerId: string;
  customerName: string;
  channel: "sms" | "email" | null;
  estimateId?: string;
  invoiceId?: string;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!channel) {
    return (
      <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
        Add a phone number or email address to message {customerName}.
      </p>
    );
  }

  const verb = channel === "sms" ? "Text" : "Email";

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
        placeholder={`${verb} ${customerName}…`}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {channel === "email" && (
        <p className="text-xs text-zinc-400">Texting isn&apos;t available for this customer, so this will be sent by email.</p>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={send}
          disabled={isPending || !body.trim()}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Sending…" : `Send ${verb.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
