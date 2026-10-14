import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { PlanCards } from "@/components/plan-cards";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_PLAN_SELECT, TRIAL_DAYS, accessFor } from "@/lib/plans";

export default async function BillingExpiredPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) redirect("/login");
  const { error } = await searchParams;

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId }, select: COMPANY_PLAN_SELECT });
  const trialOver = company ? accessFor(company).expired : false;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-5xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">{trialOver ? `Your ${TRIAL_DAYS}-day trial has ended` : "Choose a plan to continue"}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {trialOver
              ? "Your data is safe. Pick a plan to keep going. Month-to-month, cancel any time."
              : "Your subscription isn't active, so this account is locked. Pick a plan to get back in."}
          </p>
          {error && <p className="mx-auto mt-3 max-w-md rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-8">
          <PlanCards current={null} returnTo="/billing/expired" />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          Drivers are always unlimited and free. Base and Plus include 1 user, then $20/mo per extra user.
        </p>
      </div>
    </div>
  );
}
