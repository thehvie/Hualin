"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { geocodeAddress } from "@/lib/geocode";
import { buildRoute, getDriveRoute, getOfficePoint, type RouteInfo } from "@/lib/office";
import { getUsageStatus, USAGE_PAUSED_MESSAGE } from "@/lib/usage";
import type { FuelSettings } from "@/lib/fuel";

export type LookupResult =
  | { ok: true; route: RouteInfo; fuel: FuelSettings }
  | { ok: false; error: string };

/** Finds any address and returns the drive from the company's office: distance, time, line, and the fuel charge. */
export async function lookupAddress(input: string): Promise<LookupResult> {
  const { companyId, userId } = await requireSession();
  const address = input.trim().slice(0, 200);
  if (address.length < 4) return { ok: false, error: "Type an address, like 123 Main St, Orlando FL." };
  if (!rateLimit(`map-lookup:${userId}`, 120, 60 * 60 * 1000).ok) return { ok: false, error: "That's a lot of lookups. Try again in a little while." };
  if ((await getUsageStatus(companyId)).capped) return { ok: false, error: USAGE_PAUSED_MESSAGE };

  const [company, office] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { state: true, fuelRateCentsPerMile: true, fuelFreeMiles: true, fuelRoundTrip: true } }),
    getOfficePoint(companyId),
  ]);

  const found = await geocodeAddress(`${address}, US`, companyId);
  if (!found) return { ok: false, error: "Couldn't find that address. Add the city and state and try again." };

  const destination = { label: found.formatted ?? address, latitude: found.latitude, longitude: found.longitude };
  const drive = await getDriveRoute(companyId, office, destination);
  return {
    ok: true,
    route: buildRoute(office, destination, drive, false),
    fuel: { rateCentsPerMile: company.fuelRateCentsPerMile, freeMiles: company.fuelFreeMiles, roundTrip: company.fuelRoundTrip },
  };
}
