import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    select: { subscriptionStatus: true },
  });

  if (!company || !ACTIVE_STATUSES.has(company.subscriptionStatus)) {
    redirect("/billing/expired");
  }

  return {
    userId: session.user.id,
    companyId: session.user.companyId,
    role: session.user.role,
  };
}
