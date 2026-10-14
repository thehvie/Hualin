import type { Plan } from "@prisma/client";

import { choosePlan } from "@/app/billing/actions";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/plans";

/** The three plans side by side. `current` is the plan being billed now (null when nothing is subscribed). */
export function PlanCards({ current, returnTo }: { current: Plan | null; returnTo: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLAN_ORDER.map((key) => {
        const plan = PLANS[key];
        const isCurrent = current === key;
        return (
          <div
            key={key}
            className={`flex flex-col rounded-xl border bg-white p-5 ${key === "BASE" ? "border-brand" : "border-zinc-200"}`}
          >
            <h3 className="text-base font-bold text-zinc-900">{plan.name}</h3>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {formatPrice(plan.priceCents)}
              <span className="text-sm font-medium text-zinc-500">/mo</span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">{plan.tagline}</p>
            <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm text-zinc-700">
              {plan.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-emerald-600" aria-hidden>
                    ✓
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
            <form action={choosePlan.bind(null, key, returnTo)} className="mt-5">
              <button
                type="submit"
                disabled={isCurrent}
                className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:cursor-default disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                {isCurrent ? "Current plan" : current ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
