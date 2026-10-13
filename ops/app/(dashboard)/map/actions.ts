"use server";

import { revalidatePath } from "next/cache";
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

const RECENT_LIMIT = 10;

async function companyFuel(companyId: string): Promise<FuelSettings> {
  const c = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { fuelRateCentsPerMile: true, fuelFreeMiles: true, fuelRoundTrip: true } });
  return { rateCentsPerMile: c.fuelRateCentsPerMile, freeMiles: c.fuelFreeMiles, roundTrip: c.fuelRoundTrip };
}

/** Remembers an address at the top of the recent list: no duplicates, and only the latest few are kept. */
async function remember(companyId: string, label: string, latitude: number, longitude: number) {
  await prisma.mapLookup.deleteMany({ where: { companyId, label: { equals: label, mode: "insensitive" } } });
  await prisma.mapLookup.create({ data: { companyId, label: label.slice(0, 200), latitude, longitude } });
  const stale = await prisma.mapLookup.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, skip: RECENT_LIMIT, select: { id: true } });
  if (stale.length > 0) await prisma.mapLookup.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  revalidatePath("/map");
}

async function routeTo(companyId: string, destination: { label: string; latitude: number; longitude: number }): Promise<LookupResult> {
  const office = await getOfficePoint(companyId);
  const drive = await getDriveRoute(companyId, office, destination);
  return { ok: true, route: buildRoute(office, destination, drive, false), fuel: await companyFuel(companyId) };
}

/** Finds any address and returns the drive from the company's office: distance, time, line, and the fuel charge. */
export async function lookupAddress(input: string): Promise<LookupResult> {
  const { companyId, userId } = await requireSession();
  const address = input.trim().slice(0, 200);
  if (address.length < 4) return { ok: false, error: "Type an address, like 123 Main St, Orlando FL." };
  if (!rateLimit(`map-lookup:${userId}`, 120, 60 * 60 * 1000).ok) return { ok: false, error: "That's a lot of lookups. Try again in a little while." };
  if ((await getUsageStatus(companyId)).capped) return { ok: false, error: USAGE_PAUSED_MESSAGE };

  const found = await geocodeAddress(`${address}, US`, companyId);
  if (!found) return { ok: false, error: "Couldn't find that address. Add the city and state and try again." };

  const destination = { label: found.formatted ?? address, latitude: found.latitude, longitude: found.longitude };
  await remember(companyId, destination.label, destination.latitude, destination.longitude);
  return routeTo(companyId, destination);
}

/** Reopens a saved address. It reuses the stored location, so there's no new address lookup. */
export async function lookupRecent(id: string): Promise<LookupResult> {
  const { companyId } = await requireSession();
  if ((await getUsageStatus(companyId)).capped) return { ok: false, error: USAGE_PAUSED_MESSAGE };

  const saved = await prisma.mapLookup.findFirst({ where: { id, companyId } });
  if (!saved) return { ok: false, error: "That address is no longer in your recent list." };

  await remember(companyId, saved.label, saved.latitude, saved.longitude);
  return routeTo(companyId, { label: saved.label, latitude: saved.latitude, longitude: saved.longitude });
}

export async function clearRecent(): Promise<void> {
  const { companyId } = await requireSession();
  await prisma.mapLookup.deleteMany({ where: { companyId } });
  revalidatePath("/map");
}
