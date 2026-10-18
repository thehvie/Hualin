"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { featureBlock } from "@/lib/plan-access";
import { availableAssets, plannedEnd } from "@/lib/rentals";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function loadEstimate(estimateId: string, companyId: string) {
  return prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: { job: true, lineItems: true },
  });
}

function refresh(estimateId: string, jobId: string | null) {
  revalidatePath(`/estimates/${estimateId}`);
  if (jobId) revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/fleet");
}

/**
 * Creates (or trims) the job's rental bookings so there is one per dumpster the estimate's package items call for, using
 * the job's delivery and pickup dates. Units are assigned afterwards.
 */
export async function reserveRentals(estimateId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  const estimate = await loadEstimate(estimateId, companyId);
  if (!estimate?.job) return { ok: false, error: "This estimate has no job yet." };
  const job = estimate.job;
  if (!job.scheduledAt) return { ok: false, error: "Set the delivery date first (the Schedule card)." };

  const ids = estimate.lineItems.map((l) => l.priceBookItemId).filter((x): x is string => !!x);
  const items = await prisma.priceBookItem.findMany({ where: { companyId, id: { in: ids }, packageDays: { not: null } } });
  if (items.length === 0) return { ok: false, error: "None of the items on this estimate are dumpster rental packages." };

  const existing = await prisma.rentalBooking.findMany({
    where: { jobId: job.id, companyId, status: { in: ["RESERVED", "DELIVERED", "PICKUP_REQUESTED"] } },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let cancelled = 0;
  for (const item of items) {
    const needed = estimate.lineItems.filter((l) => l.priceBookItemId === item.id).reduce((s, l) => s + l.quantity, 0);
    const have = existing.filter((b) => b.priceBookItemId === item.id);
    const startAt = job.scheduledAt;
    const endAt = plannedEnd(startAt, job.scheduledEndAt, item.packageDays);

    for (let i = have.length; i < needed; i++) {
      await prisma.rentalBooking.create({
        data: { companyId, jobId: job.id, priceBookItemId: item.id, category: item.assetCategory, startAt, endAt },
      });
      created++;
    }
    // Fewer dumpsters than before: drop reserved ones that haven't been delivered, unassigned first.
    const extras = have
      .filter((b) => b.status === "RESERVED")
      .sort((a, b) => Number(!!a.assetId) - Number(!!b.assetId))
      .slice(0, Math.max(0, have.length - needed));
    for (const b of extras) {
      await prisma.rentalBooking.update({ where: { id: b.id }, data: { status: "CANCELLED", assetId: null } });
      cancelled++;
    }
  }

  refresh(estimateId, job.id);
  return { ok: true, message: created || cancelled ? `Reserved ${created}${cancelled ? `, released ${cancelled}` : ""}.` : "Already up to date." };
}

export async function assignUnit(estimateId: string, bookingId: string, assetId: string | null): Promise<Result> {
  const { companyId } = await requireSession();
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  const booking = await prisma.rentalBooking.findFirst({ where: { id: bookingId, companyId }, include: { job: { include: { estimates: { select: { id: true } } } } } });
  if (!booking || !booking.job.estimates.some((e) => e.id === estimateId)) return { ok: false, error: "Rental not found." };
  if (booking.status !== "RESERVED") return { ok: false, error: "That dumpster has already been delivered, so it can't be changed here." };

  if (assetId) {
    const free = await availableAssets(companyId, booking.category, booking.startAt, booking.endAt, booking.id);
    if (!free.some((u) => u.id === assetId)) return { ok: false, error: "That dumpster isn't free for those dates." };
  }
  // Picking one of our own units takes the rental off any vendor.
  await prisma.rentalBooking.update({
    where: { id: booking.id },
    data: { assetId, ...(assetId ? { vendorId: null, vendorCostCents: null, vendorOrderedAt: null } : {}) },
  });
  refresh(estimateId, booking.jobId);
  return { ok: true };
}

/** Fills a reservation from a partner vendor (they deliver and pick up), or takes it off the vendor. */
export async function assignVendor(estimateId: string, bookingId: string, vendorId: string | null): Promise<Result> {
  const { companyId } = await requireSession();
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  const booking = await prisma.rentalBooking.findFirst({ where: { id: bookingId, companyId }, include: { job: { include: { estimates: { select: { id: true } } } } } });
  if (!booking || !booking.job.estimates.some((e) => e.id === estimateId)) return { ok: false, error: "Rental not found." };
  if (booking.status !== "RESERVED") return { ok: false, error: "That dumpster has already been delivered, so the source can't be changed here." };

  if (!vendorId) {
    await prisma.rentalBooking.update({ where: { id: booking.id }, data: { vendorId: null, vendorCostCents: null, vendorOrderedAt: null, vendorPaidAt: null } });
  } else {
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, companyId, dumpsterPartner: true }, include: { rates: true } });
    if (!vendor) return { ok: false, error: "Vendor not found." };
    const rate = vendor.rates.find((r) => r.size.trim().toLowerCase() === (booking.category ?? "").trim().toLowerCase());
    // The vendor's cost is fixed on the rental now, so a later rate change doesn't rewrite what we owe on this job.
    await prisma.rentalBooking.update({
      where: { id: booking.id },
      data: { vendorId: vendor.id, assetId: null, vendorCostCents: rate?.costCents ?? null, vendorOrderedAt: null, vendorPaidAt: null },
    });
  }
  refresh(estimateId, booking.jobId);
  revalidatePath("/vendors");
  return { ok: true };
}

/** Record that we told the vendor about this rental (or undo it). */
export async function setVendorOrdered(estimateId: string, bookingId: string, ordered: boolean): Promise<Result> {
  const { companyId } = await requireSession();
  const res = await prisma.rentalBooking.updateMany({ where: { id: bookingId, companyId, vendorId: { not: null } }, data: { vendorOrderedAt: ordered ? new Date() : null } });
  if (res.count === 0) return { ok: false, error: "Rental not found." };
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath("/dispatch");
  return { ok: true };
}

/** Gives every unassigned reservation the first free unit of its size. */
export async function autoAssignUnits(estimateId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const blocked = await featureBlock(companyId, "RENTALS");
  if (blocked) return { ok: false, error: blocked };
  const estimate = await loadEstimate(estimateId, companyId);
  if (!estimate?.job) return { ok: false, error: "This estimate has no job yet." };

  const open = await prisma.rentalBooking.findMany({
    where: { jobId: estimate.job.id, companyId, status: "RESERVED", assetId: null, vendorId: null },
    orderBy: { createdAt: "asc" },
  });
  let assigned = 0;
  const missing = new Set<string>();
  for (const b of open) {
    // Each assignment is saved before the next check, so a unit can't be handed out twice.
    const free = await availableAssets(companyId, b.category, b.startAt, b.endAt, b.id);
    if (free.length === 0) {
      missing.add(b.category ?? "any size");
      continue;
    }
    await prisma.rentalBooking.update({ where: { id: b.id }, data: { assetId: free[0].id } });
    assigned++;
  }
  refresh(estimateId, estimate.job.id);
  if (missing.size > 0) {
    return { ok: false, error: `Assigned ${assigned}. No ${[...missing].join(", ")} dumpster is free for those dates, so ${open.length - assigned} still need one.` };
  }
  return { ok: true, message: assigned ? `Assigned ${assigned}.` : "Nothing to assign." };
}

export async function cancelRental(estimateId: string, bookingId: string): Promise<Result> {
  const { companyId } = await requireSession();
  const booking = await prisma.rentalBooking.findFirst({ where: { id: bookingId, companyId } });
  if (!booking) return { ok: false, error: "Rental not found." };
  if (booking.status !== "RESERVED") return { ok: false, error: "Only a reservation that hasn't been delivered can be cancelled." };
  await prisma.rentalBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", assetId: null } });
  refresh(estimateId, booking.jobId);
  return { ok: true };
}
