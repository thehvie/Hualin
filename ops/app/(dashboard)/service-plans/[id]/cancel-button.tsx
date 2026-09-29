"use client";

import { useTransition } from "react";
import { cancelSubscription } from "../actions";

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("Cancel this subscription? The customer will stop being charged.")) return;
    startTransition(() => cancelSubscription(subscriptionId));
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
    >
      Cancel subscription
    </button>
  );
}
