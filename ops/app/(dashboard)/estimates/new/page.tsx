import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { timezoneLabel } from "@/lib/tz";
import { NewEstimateForm } from "./new-estimate-form";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  const { companyId } = await requireSession();
  const { customerId } = await searchParams;

  const [company, priceBook] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { state: true, timezone: true } }),
    prisma.priceBookItem.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" } }),
  ]);

  const customers = await prisma.customer.findMany({
    where: { companyId },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 500,
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          <Link href="/estimates" className="hover:text-zinc-600">
            Estimates
          </Link>{" "}
          / New
        </p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">New estimate</h1>
      </div>

      <NewEstimateForm
        customers={customers.map((c) => ({
          id: c.id,
          label: `${c.firstName} ${c.lastName}${c.companyName ? ` — ${c.companyName}` : ""}`,
          detail: [c.email, c.phone].filter(Boolean).join(" · "),
        }))}
        priceBookItems={priceBook.map((p) => ({
          id: p.id,
          name: p.name,
          unitPriceCents: p.unitPriceCents,
          costCents: p.costCents,
          isRental: p.type === "RENTAL",
        }))}
        defaultState={company.state}
        timezoneName={timezoneLabel(company.timezone)}
        preselectedCustomerId={customers.some((c) => c.id === customerId) ? (customerId ?? null) : null}
      />
    </div>
  );
}
