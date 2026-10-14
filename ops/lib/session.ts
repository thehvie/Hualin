import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMPANY_PLAN_SELECT, accessFor } from "@/lib/plans";

export type AuthedSession = {
  userId: string;
  companyId: string;
  role: UserRole;
};

const ACTIVE_STATUSES = new Set(["TRIALING", "ACTIVE", "PAST_DUE"]);

// The single place tenant scoping and subscription gating are enforced.
// Subscription status is re-read from the DB on every call rather than
// trusted from the JWT, since the session cookie can outlive a Stripe
// cancellation by weeks.
export async function requireSession(): Promise<AuthedSession> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: COMPANY_PLAN_SELECT,
  });

  // A signup trial that ran out without a subscription is locked until a plan is chosen.
  if (!company || (!company.freeUnlimited && (!ACTIVE_STATUSES.has(company.subscriptionStatus) || accessFor(company).expired))) {
    redirect("/billing/expired");
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}
