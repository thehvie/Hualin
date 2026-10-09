import { prisma } from "@/lib/prisma";

// Outgoing customer email is capped so a mistake, a runaway script or a hijacked account can't blast out spam
// through the shared sending domain (which would hurt every company's deliverability). Counts come from the
// Communication log, which records every email we send, so they survive restarts.
export const EMAIL_LIMITS = {
  companyPerHour: 60,
  companyPerDay: 300,
  customerPerHour: 10, // to any one customer, so nobody gets hammered
  customerPerDay: 30,
} as const;

/** Returns a message to show the user if sending another email would go over a limit, or null if it's fine. */
export async function emailLimitMessage(companyId: string, customerId: string): Promise<string | null> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const base = { channel: "EMAIL" as const, direction: "OUTBOUND" as const };

  const [companyHour, companyDay, customerHour, customerDay] = await Promise.all([
    prisma.communication.count({ where: { ...base, companyId, createdAt: { gte: hourAgo } } }),
    prisma.communication.count({ where: { ...base, companyId, createdAt: { gte: dayAgo } } }),
    prisma.communication.count({ where: { ...base, companyId, customerId, createdAt: { gte: hourAgo } } }),
    prisma.communication.count({ where: { ...base, companyId, customerId, createdAt: { gte: dayAgo } } }),
  ]);

  if (customerHour >= EMAIL_LIMITS.customerPerHour || customerDay >= EMAIL_LIMITS.customerPerDay) {
    return "You've sent this customer a lot of emails recently. Please wait a while before sending another.";
  }
  if (companyHour >= EMAIL_LIMITS.companyPerHour || companyDay >= EMAIL_LIMITS.companyPerDay) {
    return "You've reached the email sending limit for now. It resets within the hour or the day. Contact support if you need more.";
  }
  return null;
}
