"use client";

import { useState, useTransition } from "react";

import { resendVerification } from "@/app/(dashboard)/verify-actions";

/** Shown until the signed-in person confirms their email address. */
export function VerifyEmailBanner() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span>Confirm your email address to send estimates, invoices and messages to customers.</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await resendVerification();
            setMessage(res.message);
          })
        }
        className="font-semibold underline disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send the link again"}
      </button>
      {message && <span className="text-xs">{message}</span>}
    </div>
  );
}
