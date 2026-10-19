import { prisma } from "@/lib/prisma";
import { sendTemplateToCustomer } from "@/lib/customer-messages";
import { insideSendingHours } from "@/lib/rental-reminders";

const DAY = 86_400_000;
const MAX_PER_COMPANY_PER_RUN = 25;

export interface ReviewRunSummary {
  companies: number;
  sent: number;
  failed: number;
}

/**
 * Asks customers for a review N days after their invoice was paid, by email and/or text (per the Review request
 * template). Each invoice is asked at most once, and only invoices paid after the company switched requests on.
 * Run from the server's cron every 15 minutes.
 */
export async function runReviewRequests(now = new Date()): Promise<ReviewRunSummary> {
  const summary: ReviewRunSummary = { companies: 0, sent: 0, failed: 0 };
  const companies = await prisma.company.findMany({
    where: { reviewRequestsOn: true, reviewLinkUrl: { not: null }, reviewRequestsSince: { not: null } },
    select: { id: true, timezone: true, reviewLinkUrl: true, reviewRequestDays: true, reviewRequestsSince: true, reviewSendStartHour: true, reviewSendEndHour: true },
  });

  for (const company of companies) {
    if (!company.reviewLinkUrl || !company.reviewRequestsSince) continue;
    if (!insideSendingHours(now, company.timezone, company.reviewSendStartHour, company.reviewSendEndHour)) continue;
    summary.companies++;

    const due = await prisma.invoice.findMany({
      where: {
        companyId: company.id,
        status: "PAID",
        reviewRequestedAt: null,
        paidAt: { gte: company.reviewRequestsSince, lte: new Date(now.getTime() - company.reviewRequestDays * DAY) },
      },
      orderBy: { paidAt: "asc" },
      take: MAX_PER_COMPANY_PER_RUN,
      select: { id: true, customerId: true },
    });

    for (const invoice of due) {
      // Claim the invoice first so an overlapping run can't ask twice.
      const claimed = await prisma.invoice.updateMany({ where: { id: invoice.id, reviewRequestedAt: null }, data: { reviewRequestedAt: now } });
      if (claimed.count === 0) continue;
      try {
        const res = await sendTemplateToCustomer({
          companyId: company.id,
          customerId: invoice.customerId,
          key: "REVIEW_REQUEST",
          vars: { review_link: company.reviewLinkUrl },
        });
        await prisma.invoice.update({ where: { id: invoice.id }, data: { reviewRequestNote: res.ok ? `Sent by ${res.sent.join(" and ")}.` : (res.error ?? "Not sent.") } });
        if (res.ok) summary.sent++;
        else summary.failed++;
      } catch (err) {
        console.error("[review requests] failed", err);
        await prisma.invoice.update({ where: { id: invoice.id }, data: { reviewRequestNote: "Failed to send." } });
        summary.failed++;
      }
    }
  }
  return summary;
}
