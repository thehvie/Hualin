import Link from "next/link";

import { buyBrandUpgrade, buyTextPack, openBillingPortal } from "@/app/billing/actions";
import { PlanCards } from "@/components/plan-cards";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getTextUsage } from "@/lib/plan-access";
import { BRAND_UPGRADE_CENTS, COMPANY_PLAN_SELECT, PLANS, SMS_PACK_CENTS, SMS_PACK_TEXTS, SMS_WARN_AT, accessFor, formatPrice } from "@/lib/plans";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ error?: string; subscribed?: string; changed?: string; brand?: string; texts?: string }> }) {
  const { companyId, role } = await requireSession();
  const sp = await searchParams;
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { ...COMPANY_PLAN_SELECT, stripeCustomerId: true } });
  const access = accessFor(company);
  const subscribed = !!company.stripeSubscriptionId;
  const isAdmin = role === "ADMIN";
  const texts = await getTextUsage(companyId);
  const textsLow = texts.enabled && texts.sent >= texts.allowance * SMS_WARN_AT;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-zinc-400 hover:text-zinc-700">
          ← Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Plan and billing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {access.onTrial
            ? `Free trial: the full system for ${access.trialDaysLeft} more day${access.trialDaysLeft === 1 ? "" : "s"}. No card needed. Pick a plan any time.`
            : `You're on ${PLANS[company.plan].name}.`}
        </p>
      </div>

      {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      {(sp.subscribed || sp.changed) && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Your plan is updated. It can take a few seconds to show everywhere.</p>}
      {sp.texts && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Text pack purchased. The texts show up in a few seconds.</p>}
      {sp.brand && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Brand upgrade purchased. It can take a few seconds to turn on.</p>}

      {isAdmin ? <PlanCards current={subscribed ? company.plan : null} returnTo="/settings/plan" /> : <p className="text-sm text-zinc-500">Ask an admin to change the plan.</p>}

      {texts.enabled && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Texts this month</h2>
            <p className="mt-1 text-sm text-zinc-700">
              {Math.min(texts.sent, texts.allowance)} of {texts.allowance} included
              {texts.sent > texts.allowance && `, plus ${texts.sent - texts.allowance} from extra texts`}. Extra texts left: {texts.credits}.
            </p>
            {textsLow && !texts.canSend && <p className="mt-1 text-xs font-medium text-red-700">Out of texts. Messages go by email until you add more or the month resets.</p>}
            {textsLow && texts.canSend && texts.credits === 0 && <p className="mt-1 text-xs font-medium text-amber-700">Almost out of texts for the month.</p>}
            <p className="mt-1 text-xs text-zinc-500">
              Extra texts are {SMS_PACK_TEXTS} for {formatPrice(SMS_PACK_CENTS)}, one time. They carry over from month to month and are used after your included texts.
            </p>
          </div>
          {isAdmin && (
            <form action={buyTextPack}>
              <button type="submit" className="whitespace-nowrap rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Buy {SMS_PACK_TEXTS} texts
              </button>
            </form>
          )}
        </div>
      )}

      {company.plan === "STARTER" && !access.onTrial && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Brand upgrade, {formatPrice(BRAND_UPGRADE_CENTS)} one time</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {company.brandUpgrade
                ? "Active: your logo is on your documents and the Powered by line is off."
                : "Put your logo on estimates, invoices and PDFs, and remove the Powered by line. Free on Base and Plus."}
            </p>
          </div>
          {isAdmin && !company.brandUpgrade && (
            <form action={buyBrandUpgrade}>
              <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Buy
              </button>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/settings/team" className="font-medium text-brand-dark hover:underline">
          Manage team and seats
        </Link>
        {isAdmin && company.stripeCustomerId && (
          <form action={openBillingPortal}>
            <button type="submit" className="font-medium text-brand-dark hover:underline">
              Card, invoices and cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
