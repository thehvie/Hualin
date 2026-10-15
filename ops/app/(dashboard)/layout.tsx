import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { unreadMessageCount } from "@/lib/inbox";
import { getTextUsage } from "@/lib/plan-access";
import { COMPANY_PLAN_SELECT, FEATURE_MIN_PLAN, PLANS, SMS_WARN_AT, accessFor, type Feature } from "@/lib/plans";
import { DashboardNav } from "./dashboard-nav";
import { VerifyEmailBanner } from "@/components/verify-email-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { companyId, userId } = await requireSession();
  const [company, unread] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true, ...COMPANY_PLAN_SELECT } }),
    unreadMessageCount(companyId),
  ]);

  const access = company ? accessFor(company) : null;
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  const unverified = !!me && !me.emailVerified && !company?.freeUnlimited;
  const texts = access && access.features.has("TEXTING") ? await getTextUsage(companyId) : null;
  const textsWarning = texts?.enabled && texts.credits === 0 && texts.sent >= texts.allowance * SMS_WARN_AT ? (texts.canSend ? "almost" : "out") : null;
  // Nav items whose feature isn't on the plan: shown greyed with a lock, linking to the plans page.
  const lockedHrefs: Record<string, string> = {};
  const gated: Record<string, Feature> = { "/dispatch": "RENTALS", "/fleet": "RENTALS", "/online-booking": "ONLINE_BOOKING" };
  if (access) {
    for (const [href, feature] of Object.entries(gated)) {
      if (!access.features.has(feature)) lockedHrefs[href] = PLANS[FEATURE_MIN_PLAN[feature]].name;
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 lg:flex-row">
      <DashboardNav companyName={company?.name ?? "Ops"} unreadMessages={unread} lockedPlans={lockedHrefs} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {unverified && <VerifyEmailBanner />}
        {access?.onTrial && (
          <Link href="/settings/plan" className="mb-4 block rounded-lg bg-brand/10 px-4 py-2 text-sm font-medium text-brand-dark hover:bg-brand/15">
            Free trial: {access.trialDaysLeft} day{access.trialDaysLeft === 1 ? "" : "s"} left of the full system. Pick a plan
          </Link>
        )}
        {textsWarning && (
          <Link href="/settings/plan" className={`mb-4 block rounded-lg px-4 py-2 text-sm font-medium ${textsWarning === "out" ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}>
            {textsWarning === "out" ? "Out of texts for this month. Messages go by email. Buy more texts" : "Almost out of texts for this month. Buy more texts"}
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
