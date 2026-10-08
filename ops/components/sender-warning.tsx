"use client";

import { useTransition } from "react";
import { confirmSender } from "@/app/(dashboard)/messages-actions";

/** Shown on an inbound email from an address that isn't the customer's, until staff confirm it. */
export function SenderWarning({ communicationId, attachmentCount }: { communicationId: string; attachmentCount: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
      <p>
        <strong>Unverified sender.</strong> This didn&apos;t come from the customer&apos;s email on file.
        {attachmentCount > 0 && ` ${attachmentCount} attachment${attachmentCount === 1 ? " is" : "s are"} hidden until you confirm it.`}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => void (await confirmSender(communicationId)))}
        className="mt-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 disabled:opacity-50"
      >
        {pending ? "Confirming…" : "This is the customer"}
      </button>
    </div>
  );
}
