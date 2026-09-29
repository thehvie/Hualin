import { prisma } from "@/lib/prisma";

/** Highest sales tax rate we accept in Settings, in percent. */
export const MAX_TAX_PERCENT = 20;

/** "6.5" -> 650 basis points. Null if it isn't a number between 0 and MAX_TAX_PERCENT. */
export function percentToBps(input: string): number | null {
  const value = input.trim().replace(/%$/, "");
  if (value === "") return 0;
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(value)) return null;
  const pct = parseFloat(value);
  if (!Number.isFinite(pct) || pct < 0 || pct > MAX_TAX_PERCENT) return null;
  return Math.round(pct * 100);
}

/** 650 -> "6.5" (no trailing zeros); 0 -> "0". */
export function bpsToPercent(bps: number): string {
  return String(parseFloat((bps / 100).toFixed(2)));
}

/** The company's current default sales tax rate row, or null when tax is off. */
export async function getDefaultTaxRate(companyId: string) {
  return prisma.taxRate.findFirst({ where: { companyId, isDefault: true, active: true } });
}

/**
 * Sets the company's default sales tax rate. Rates are never edited in place:
 * invoices point at a TaxRate row, so changing a row would silently change
 * invoices already issued. A new rate retires the old row (kept, inactive, so
 * old invoices still show it) and creates a fresh one. 0 means "no tax" and
 * simply leaves no default.
 */
export async function setDefaultTaxRate(companyId: string, bps: number): Promise<void> {
  const current = await getDefaultTaxRate(companyId);
  if ((current?.rateBps ?? 0) === bps) return;

  await prisma.$transaction(async (tx) => {
    if (current) {
      await tx.taxRate.update({ where: { id: current.id }, data: { isDefault: false, active: false } });
    }
    if (bps > 0) {
      await tx.taxRate.create({ data: { companyId, name: "Sales tax", rateBps: bps, isDefault: true, active: true } });
    }
  });
}
