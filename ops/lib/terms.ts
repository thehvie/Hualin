import { prisma } from "@/lib/prisma";

import { DEFAULT_TERMS } from "@/lib/terms-default";

export { DEFAULT_TERMS };

/** Does this document include a rental (a dumpster or equipment)? Then the company's rental terms apply too. */
export async function hasRentalItems(
  companyId: string,
  lineItems: { priceBookItemId: string | null; isRental: boolean }[],
): Promise<boolean> {
  if (lineItems.some((l) => l.isRental)) return true;
  const ids = lineItems.map((l) => l.priceBookItemId).filter((x): x is string => !!x);
  if (ids.length === 0) return false;
  return (await prisma.priceBookItem.count({ where: { companyId, id: { in: ids }, type: "RENTAL" } })) > 0;
}

/** The terms & conditions text that goes on a document: the company's terms (or the default), plus rental terms when it has a rental. */
export function documentTerms(company: { termsText: string | null; rentalTermsText: string | null }, hasRental: boolean): string {
  const base = company.termsText?.trim() || DEFAULT_TERMS;
  const rental = hasRental ? company.rentalTermsText?.trim() : "";
  return rental ? `${base}\n\n### Rental terms\n${rental}` : base;
}
