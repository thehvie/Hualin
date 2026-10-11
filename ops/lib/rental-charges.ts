import { wallYmd } from "@/lib/tz";

/** The pricing a dumpster package item carries. */
export interface PackageTerms {
  name: string;
  packageDays: number | null;
  extraDayCents: number | null;
  includedTons: number | null;
  overageCentsPerTon: number | null;
}

export interface RentalChargeLine {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface RentalCharges {
  /** Calendar days from delivery to pickup (delivered Oct 1, picked up Oct 8 = 7). */
  daysOut: number;
  extraDays: number;
  overTons: number;
  lines: RentalChargeLine[];
  totalCents: number;
}

function daysBetween(a: Date, b: Date, tz: string): number {
  const [ay, am, ad] = wallYmd(a, tz).split("-").map(Number);
  const [by, bm, bd] = wallYmd(b, tz).split("-").map(Number);
  return Math.max(0, Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000));
}

/**
 * What a returned dumpster owes beyond its package price: days kept past the included days, and weight over the
 * included tons. Needs the pickup to have happened; items with no extra-day or overweight rates add nothing.
 */
export function rentalCharges(
  booking: { deliveredAt: Date | null; pickedUpAt: Date | null; weightTons: number | null },
  terms: PackageTerms | null,
  tz: string,
): RentalCharges | null {
  if (!terms || !booking.deliveredAt || !booking.pickedUpAt) return null;

  const daysOut = daysBetween(booking.deliveredAt, booking.pickedUpAt, tz);
  const lines: RentalChargeLine[] = [];

  const extraDays = terms.packageDays != null && terms.extraDayCents ? Math.max(0, daysOut - terms.packageDays) : 0;
  if (extraDays > 0 && terms.extraDayCents) {
    lines.push({ description: `${terms.name}: extra rental days (${daysOut} days out, ${terms.packageDays} included)`, quantity: extraDays, unitPriceCents: terms.extraDayCents });
  }

  const overTons =
    terms.includedTons != null && terms.overageCentsPerTon && booking.weightTons != null ? Math.max(0, booking.weightTons - terms.includedTons) : 0;
  if (overTons > 0 && terms.overageCentsPerTon) {
    const cents = Math.round(overTons * terms.overageCentsPerTon);
    lines.push({
      description: `${terms.name}: overweight (${booking.weightTons} tons, ${terms.includedTons} included, ${overTons.toFixed(2)} over at $${(terms.overageCentsPerTon / 100).toFixed(2)}/ton)`,
      quantity: 1,
      unitPriceCents: cents,
    });
  }

  return { daysOut, extraDays, overTons, lines, totalCents: lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0) };
}
