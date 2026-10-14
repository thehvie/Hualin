import { prisma } from "@/lib/prisma";
import { COMPANY_PLAN_SELECT, accessFor, hasFeature, upgradeMessage, type Feature, type PlanAccess } from "@/lib/plans";
import { monthRange } from "@/lib/usage";

// Server-side plan checks. The nav greys out locked features, but every real gate lives here so a locked feature
// can't be reached by typing the URL or calling its endpoint directly.

export async function getPlanAccess(companyId: string): Promise<PlanAccess> {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: COMPANY_PLAN_SELECT });
  return accessFor(company);
}

export async function companyHasFeature(companyId: string, feature: Feature): Promise<boolean> {
  return hasFeature(await getPlanAccess(companyId), feature);
}

/** For server actions and API routes: null when allowed, otherwise the message to show. */
export async function featureBlock(companyId: string, feature: Feature): Promise<string | null> {
  return (await companyHasFeature(companyId, feature)) ? null : upgradeMessage(feature);
}

/** Office users count toward seats; drivers (CREW) are unlimited and free. */
export async function officeUserCount(companyId: string): Promise<number> {
  return prisma.user.count({ where: { companyId, role: { not: "CREW" } } });
}

export interface TextUsage {
  /** Texting is part of the plan. */
  enabled: boolean;
  sent: number;
  allowance: number;
  credits: number;
  /** A text can go out: under the monthly allowance, or bought credits remain. */
  canSend: boolean;
}

export async function getTextUsage(companyId: string): Promise<TextUsage> {
  const access = await getPlanAccess(companyId);
  const enabled = hasFeature(access, "TEXTING") && access.smsPerMonth > 0;
  const { start, end } = monthRange();
  const [sent, company] = await Promise.all([
    prisma.communication.count({ where: { companyId, channel: "SMS", direction: "OUTBOUND", createdAt: { gte: start, lt: end } } }),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { smsCredits: true } }),
  ]);
  return { enabled, sent, allowance: access.smsPerMonth, credits: company.smsCredits, canSend: enabled && (sent < access.smsPerMonth || company.smsCredits > 0) };
}

/** Texting is on the plan and either this month's texts are under the allowance or bought credits remain. */
export async function canSendText(companyId: string): Promise<boolean> {
  return (await getTextUsage(companyId)).canSend;
}

/** Call right after an outbound text is logged: texts past the monthly allowance use one bought credit. */
export async function recordTextSent(companyId: string): Promise<void> {
  try {
    const u = await getTextUsage(companyId);
    if (u.sent > u.allowance && u.credits > 0) {
      await prisma.company.updateMany({ where: { id: companyId, smsCredits: { gt: 0 } }, data: { smsCredits: { decrement: 1 } } });
    }
  } catch (err) {
    console.error("Failed to record text credit use", err);
  }
}

export const TEXT_BLOCKED_MESSAGE = "Texting isn't available on this plan, or this month's text limit has been reached. Email still works.";
