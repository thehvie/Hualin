import Link from "next/link";
import { FEATURE_LABELS, FEATURE_MIN_PLAN, PLANS, formatPrice, type Feature } from "@/lib/plans";

/** Shown in place of a page whose feature isn't on the company's plan. */
export function FeatureLocked({ feature, title }: { feature: Feature; title?: string }) {
  const needed = PLANS[FEATURE_MIN_PLAN[feature]];
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <h1 className="text-lg font-bold text-zinc-900">{title ?? FEATURE_LABELS[feature]}</h1>
      <p className="text-sm text-zinc-500">
        This is part of the {needed.name} plan ({formatPrice(needed.priceCents)}/mo). Your data is safe and nothing is deleted. It comes back as soon as you upgrade.
      </p>
      <Link href="/settings/plan" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
        See plans
      </Link>
    </div>
  );
}
