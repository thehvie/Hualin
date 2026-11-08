import { prisma } from "@/lib/prisma";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { addDaysYmd, startOfDayInTz, wallParts, wallYmd } from "@/lib/tz";

/**
 * "Sales" = money actually collected on invoices. One source of truth for the home page and the invoices Paid tab.
 *
 * Every recorded payment counts on the day it was recorded. An invoice marked Paid whose payments don't cover its total
 * (older invoices were flipped to Paid without a payment row) still counts in full: the uncovered part lands on the
 * invoice's paid date, or its invoice date if that's missing. Void invoices never count.
 */
export interface SaleEvent {
  invoiceId: string;
  at: Date;
  cents: number;
}

export interface SalesSummary {
  todayCents: number;
  last14Cents: number;
  monthCents: number;
  yearCents: number;
  allTimeCents: number;
}

export async function loadSaleEvents(companyId: string): Promise<SaleEvent[]> {
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { not: "VOID" }, OR: [{ status: "PAID" }, { payments: { some: {} } }] },
    include: { lineItems: true, payments: true, taxRate: true },
  });

  const events: SaleEvent[] = [];
  for (const inv of invoices) {
    for (const p of inv.payments) events.push({ invoiceId: inv.id, at: p.createdAt, cents: p.amountCents });
    if (inv.status === "PAID") {
      const totals = computeInvoiceTotals({
        lineItems: inv.lineItems,
        discountCents: inv.discountCents,
        fuelSurchargeCents: inv.fuelSurchargeCents,
        tipCents: inv.tipCents,
        taxRateBps: inv.taxRate?.rateBps ?? 0,
        payments: inv.payments,
      });
      if (totals.balanceCents > 0) {
        events.push({ invoiceId: inv.id, at: inv.paidAt ?? inv.invoiceDate, cents: totals.balanceCents });
      }
    }
  }
  return events;
}

/** Totals for today / last 14 days / this month / this year / all time, using the company's calendar. */
export function summarizeSales(events: SaleEvent[], timezone: string, now = new Date()): SalesSummary {
  const todayYmd = wallYmd(now, timezone);
  const { year, month } = wallParts(now, timezone);
  const pad = (n: number) => String(n).padStart(2, "0");

  const todayStart = startOfDayInTz(todayYmd, timezone).getTime();
  const tomorrowStart = startOfDayInTz(addDaysYmd(todayYmd, 1), timezone).getTime();
  const last14Start = startOfDayInTz(addDaysYmd(todayYmd, -13), timezone).getTime();
  const monthStart = startOfDayInTz(`${year}-${pad(month)}-01`, timezone).getTime();
  const yearStart = startOfDayInTz(`${year}-01-01`, timezone).getTime();

  const sum = (from: number, to = Infinity) =>
    events.reduce((s, e) => {
      const t = e.at.getTime();
      return t >= from && t < to ? s + e.cents : s;
    }, 0);

  return {
    todayCents: sum(todayStart, tomorrowStart),
    last14Cents: sum(last14Start, tomorrowStart),
    monthCents: sum(monthStart, tomorrowStart),
    yearCents: sum(yearStart, tomorrowStart),
    allTimeCents: events.reduce((s, e) => s + e.cents, 0),
  };
}

/** Date the invoice was fully paid, for the Paid list: its paid date, else its latest payment, else its invoice date. */
export function paidDateOf(inv: { paidAt: Date | null; invoiceDate: Date; payments: { createdAt: Date }[] }): Date {
  if (inv.paidAt) return inv.paidAt;
  const latest = inv.payments.reduce<Date | null>((d, p) => (!d || p.createdAt > d ? p.createdAt : d), null);
  return latest ?? inv.invoiceDate;
}
