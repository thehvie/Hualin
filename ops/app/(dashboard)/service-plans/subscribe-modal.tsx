"use client";

import { useState, useTransition } from "react";
import { subscribeClientToPlan, emailCheckoutLink } from "./actions";
import { formatCents } from "@/lib/money";
import { BILLING_FREQUENCY_LABELS } from "@/lib/service-plans";

interface CustomerOption {
  id: string;
  name: string;
  properties: { id: string; address: string }[];
}

interface PlanOption {
  id: string;
  name: string;
  billingOptions: { id: string; frequency: string; amountCents: number }[];
}

export function SubscribeClientButton({ customers, plans }: { customers: CustomerOption[]; plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        + Subscribe a client
      </button>
      {open && <SubscribeModal customers={customers} plans={plans} onClose={() => setOpen(false)} />}
    </>
  );
}

function SubscribeModal({
  customers,
  plans,
  onClose,
}: {
  customers: CustomerOption[];
  plans: PlanOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [result, setResult] = useState<{ checkoutUrl: string; subscriptionId: string } | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedPlan = plans.find((p) => p.id === planId);

  function handleSubmit(fd: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await subscribeClientToPlan(fd);
      if (!res.ok || !res.checkoutUrl || !res.subscriptionId) {
        setError(res.error || "Could not create subscription.");
        return;
      }
      setResult({ checkoutUrl: res.checkoutUrl, subscriptionId: res.subscriptionId });
    });
  }

  function handleEmail() {
    if (!result) return;
    startTransition(async () => {
      const res = await emailCheckoutLink(result.subscriptionId, result.checkoutUrl);
      setEmailNotice(res.ok ? "Email sent." : res.error || "Could not send email.");
    });
  }

  if (plans.length === 0) {
    return (
      <Overlay onClose={onClose} title="Subscribe a client">
        <p className="text-sm text-zinc-500">
          No plan templates yet — create one first in the{" "}
          <a href="/service-plans/manager" className="font-medium text-brand hover:underline">
            Service plans manager
          </a>
          .
        </p>
      </Overlay>
    );
  }

  if (result) {
    return (
      <Overlay onClose={onClose} title="Subscription created">
        <p className="text-sm text-zinc-600">
          Send this checkout link to the customer to complete their subscription:
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">
          <span className="truncate">{result.checkoutUrl}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(result.checkoutUrl)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Copy link
          </button>
          <button
            type="button"
            onClick={handleEmail}
            disabled={isPending}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Email to customer
          </button>
        </div>
        {emailNotice && <p className="mt-2 text-sm text-zinc-500">{emailNotice}</p>}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800">
            Done
          </button>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} title="Subscribe a client">
      <form action={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Customer</label>
          <select
            name="customerId"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {selectedCustomer && selectedCustomer.properties.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Property</label>
            <select name="propertyId" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand">
              {selectedCustomer.properties.map((p) => (
                <option key={p.id} value={p.id}>{p.address}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Plan</label>
          <select
            name="servicePlanId"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {selectedPlan && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Billing option</label>
            <select name="billingOptionId" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand">
              {selectedPlan.billingOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {BILLING_FREQUENCY_LABELS[b.frequency] ?? b.frequency} — {formatCents(b.amountCents)}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="mt-2 flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            Create checkout link
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
