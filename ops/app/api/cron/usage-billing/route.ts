import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { SERVICE_LABELS, formatMicros, monthKey, monthRange, overageCents } from "@/lib/usage";

// Run once a month (e.g. on the 1st) from the server's cron:
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://ops.haulinjunkies.com/api/cron/usage-billing
// Bills the PREVIOUS calendar month (UTC), or ?month=YYYY-MM to run a specific one. Each company is billed once
// per month: the amount over the included allowance, plus markup, becomes a pending Stripe invoice item that
// lands on the company's next subscription invoice.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  const stripe = new Stripe(stripeKey);

  const param = req.nextUrl.searchParams.get("month");
  let anchor: Date;
  if (param) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(param)) return NextResponse.json({ error: "month must be YYYY-MM" }, { status: 400 });
    anchor = new Date(`${param}-01T00:00:00Z`);
  } else {
    const now = new Date();
    anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  }
  const { start, end } = monthRange(anchor);
  const month = monthKey(start);

  const companies = await prisma.company.findMany({
    where: { stripeCustomerId: { not: null }, subscriptionStatus: { in: ["ACTIVE", "PAST_DUE", "TRIALING"] } },
    select: { id: true, name: true, stripeCustomerId: true },
  });

  const results: { companyId: string; usage: string; billedCents: number; status: string }[] = [];
  for (const company of companies) {
    if (await prisma.usageStatement.findUnique({ where: { companyId_month: { companyId: company.id, month } } })) {
      results.push({ companyId: company.id, usage: "-", billedCents: 0, status: "already billed" });
      continue;
    }

    const groups = await prisma.usageEvent.groupBy({
      by: ["service"],
      where: { companyId: company.id, createdAt: { gte: start, lt: end } },
      _sum: { costMicros: true },
    });
    const usageMicros = groups.reduce((sum, g) => sum + (g._sum.costMicros ?? 0), 0);
    const billedCents = overageCents(usageMicros);

    let stripeInvoiceItemId: string | null = null;
    if (billedCents > 0) {
      const breakdown = groups.map((g) => `${SERVICE_LABELS[g.service] ?? g.service} ${formatMicros(g._sum.costMicros ?? 0)}`).join(", ");
      try {
        const item = await stripe.invoiceItems.create(
          {
            customer: company.stripeCustomerId!,
            amount: billedCents,
            currency: "usd",
            description: `AI and map usage for ${month} (${breakdown})`,
          },
          { idempotencyKey: `usage-${company.id}-${month}` },
        );
        stripeInvoiceItemId = item.id;
      } catch (err) {
        console.error("Usage billing failed for", company.id, err);
        results.push({ companyId: company.id, usage: formatMicros(usageMicros), billedCents, status: "stripe error" });
        continue;
      }
    }

    await prisma.usageStatement.create({ data: { companyId: company.id, month, usageMicros, billedCents, stripeInvoiceItemId } });
    results.push({ companyId: company.id, usage: formatMicros(usageMicros), billedCents, status: billedCents > 0 ? "billed" : "within allowance" });
  }

  return NextResponse.json({ month, results });
}
