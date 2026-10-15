import { prisma } from "@/lib/prisma";
import type { SetupStep } from "@/components/setup-checklist";

/** Which first-run steps a company has finished, worked out from its data. */
export async function loadSetupSteps(companyId: string): Promise<SetupStep[]> {
  const [company, priceItems, customers, estimates] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { phone: true, email: true, logoDataUrl: true } }),
    prisma.priceBookItem.count({ where: { companyId } }),
    prisma.customer.count({ where: { companyId } }),
    prisma.estimate.count({ where: { companyId } }),
  ]);

  return [
    { key: "company", title: "Add your company details and logo", hint: "Your phone, email and logo appear on every estimate and invoice.", href: "/settings", cta: "Open settings", done: !!(company.phone && company.email && company.logoDataUrl) },
    { key: "pricebook", title: "Build your price book", hint: "The items and prices you quote: dumpster sizes, junk loads, extras.", href: "/price-book", cta: "Open price book", done: priceItems > 0 },
    { key: "customers", title: "Add your customers", hint: "Add one by hand, or bring in a spreadsheet.", href: "/customers/new", cta: "Add a customer", altHref: "/customers/import", altLabel: "Import spreadsheet", done: customers > 0 },
    { key: "estimate", title: "Send your first estimate", hint: "Try the voice button on a new estimate. Say the job out loud and it fills in.", href: "/estimates/new", cta: "New estimate", done: estimates > 0 },
  ];
}
