import { prisma } from "@/lib/prisma";
import { spanText } from "@/lib/rental-clock";
import { addDaysYmd, formatInTz, startOfDayInTz, wallYmd } from "@/lib/tz";
import { getPropertyPoint } from "@/lib/office";

import type { PinKind } from "@/lib/map-pin-style";

export type { PinKind };

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  kind: PinKind;
  title: string;
  subtitle: string;
  when: string;
  address: string;
  href: string;
}

export interface PinResult {
  pins: Pin[];
  /** Stops with no address on file (or one that couldn't be found), so they can't be pinned. */
  unlocated: { title: string; subtitle: string; href: string }[];
}

type Property = {
  id: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
};

const MAX_GEOCODES = 25; // new addresses looked up (and saved) per page view

class Locator {
  private lookups = 0;
  constructor(private companyId: string) {}

  /** A property's coordinates. Missing ones are geocoded once and saved, up to a cap per view. */
  async locate(p: Property | null): Promise<{ lat: number; lng: number; address: string } | null> {
    if (!p) return null;
    const address = `${p.addressLine1}${p.addressLine2 ? ` ${p.addressLine2}` : ""}, ${p.city}, ${p.state} ${p.zip}`;
    if (p.latitude != null && p.longitude != null) return { lat: p.latitude, lng: p.longitude, address };
    if (this.lookups >= MAX_GEOCODES) return null;
    this.lookups++;
    const point = await getPropertyPoint(this.companyId, p);
    return point.latitude != null && point.longitude != null ? { lat: point.latitude, lng: point.longitude, address } : null;
  }
}

const timeLabel = (d: Date, tz: string) => formatInTz(d, tz, { hour: "numeric", minute: "2-digit" });
const dateLabel = (d: Date, tz: string) => formatInTz(d, tz, { month: "short", day: "numeric" });

/** Everything happening on one day (company timezone): visits, dumpster drop-offs and pickups, and any overdue pickups if it's today. */
export async function dayPins(companyId: string, tz: string, ymd: string): Promise<PinResult> {
  const start = startOfDayInTz(ymd, tz);
  const end = startOfDayInTz(addDaysYmd(ymd, 1), tz);
  const isToday = ymd === wallYmd(new Date(), tz);
  const locator = new Locator(companyId);
  const pins: Pin[] = [];
  const unlocated: PinResult["unlocated"] = [];

  const add = async (
    property: Property | null,
    kind: PinKind,
    id: string,
    title: string,
    subtitle: string,
    when: string,
    href: string,
  ) => {
    const spot = await locator.locate(property);
    if (spot) pins.push({ id, lat: spot.lat, lng: spot.lng, kind, title, subtitle, when, address: spot.address, href });
    else unlocated.push({ title, subtitle: `${subtitle} · ${when}`, href });
  };

  // Ordinary jobs scheduled that day (jobs with dumpsters are shown through their drop-off and pickup instead).
  const jobs = await prisma.job.findMany({
    where: {
      companyId,
      status: { not: "CANCELLED" },
      rentals: { none: {} },
      scheduledAt: { lt: end },
      OR: [{ scheduledAt: { gte: start } }, { scheduledEndAt: { gte: start } }],
    },
    include: { customer: true, property: true },
    orderBy: { scheduledAt: "asc" },
  });
  for (const j of jobs) {
    const name = `${j.customer.firstName} ${j.customer.lastName}`;
    await add(j.property, "job", `job-${j.id}`, name, j.notes?.split("\n")[0]?.slice(0, 60) || "Job", j.scheduledAt ? timeLabel(j.scheduledAt, tz) : "", `/jobs/${j.id}`);
  }

  const bookings = await prisma.rentalBooking.findMany({
    where: {
      companyId,
      status: { not: "CANCELLED" },
      OR: [
        { startAt: { gte: start, lt: end } },
        { endAt: { gte: start, lt: end }, status: { not: "PICKED_UP" } },
        ...(isToday ? [{ status: { in: ["DELIVERED", "PICKUP_REQUESTED"] as ("DELIVERED" | "PICKUP_REQUESTED")[] }, endAt: { lt: start } }] : []),
      ],
    },
    include: { asset: true, job: { include: { customer: true, property: true } } },
    orderBy: { startAt: "asc" },
  });
  for (const b of bookings) {
    const name = `${b.job.customer.firstName} ${b.job.customer.lastName}`;
    const unit = `${b.category ?? "Dumpster"}${b.asset ? ` · ${b.asset.label}` : ""}`;
    const href = `/jobs/${b.jobId}`;
    const deliversToday = b.startAt >= start && b.startAt < end && b.status === "RESERVED";
    const pickupToday = b.endAt >= start && b.endAt < end && b.status !== "PICKED_UP" && b.status !== "RESERVED";
    const overdue = b.endAt < start && b.status !== "RESERVED" && b.status !== "PICKED_UP";
    const reservedPickup = b.endAt >= start && b.endAt < end && b.status === "RESERVED";

    if (deliversToday) await add(b.job.property, "delivery", `d-${b.id}`, name, `Drop off ${unit}`, timeLabel(b.startAt, tz), href);
    if (pickupToday || reservedPickup) await add(b.job.property, "pickup", `p-${b.id}`, name, `Pick up ${unit}`, timeLabel(b.endAt, tz), href);
    if (overdue) await add(b.job.property, "overdue", `o-${b.id}`, name, `Overdue pickup, ${unit}`, `was due ${dateLabel(b.endAt, tz)}`, href);
  }

  return { pins, unlocated };
}

/** Every dumpster out on a customer's site right now, with how long it has been there. */
export async function dumpsterPins(companyId: string, tz: string): Promise<PinResult> {
  const now = Date.now();
  const locator = new Locator(companyId);
  const pins: Pin[] = [];
  const unlocated: PinResult["unlocated"] = [];

  const bookings = await prisma.rentalBooking.findMany({
    where: { companyId, status: { in: ["DELIVERED", "PICKUP_REQUESTED"] } },
    include: { asset: true, job: { include: { customer: true, property: true } } },
    orderBy: { endAt: "asc" },
  });
  for (const b of bookings) {
    const name = `${b.job.customer.firstName} ${b.job.customer.lastName}`;
    const unit = `${b.category ?? "Dumpster"}${b.asset ? ` · ${b.asset.label}` : ""}`;
    const daysOut = Math.max(0, Math.floor((now - (b.deliveredAt ?? b.startAt).getTime()) / 86_400_000));
    const late = b.endAt.getTime() < now;
    const kind: PinKind = late ? "overdue" : b.status === "PICKUP_REQUESTED" ? "pickup" : "onsite";
    const left = late ? `overdue ${spanText(now - b.endAt.getTime())}` : `${spanText(b.endAt.getTime() - now)} left`;
    const when = `${daysOut} day${daysOut === 1 ? "" : "s"} out · due ${dateLabel(b.endAt, tz)} · ${left}${b.status === "PICKUP_REQUESTED" ? " · pickup requested" : ""}`;
    const spot = await locator.locate(b.job.property);
    if (spot) pins.push({ id: b.id, lat: spot.lat, lng: spot.lng, kind, title: `${unit}`, subtitle: name, when, address: spot.address, href: `/jobs/${b.jobId}` });
    else unlocated.push({ title: unit, subtitle: `${name} · ${when}`, href: `/jobs/${b.jobId}` });
  }
  return { pins, unlocated };
}
