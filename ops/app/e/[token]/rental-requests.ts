"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailgun";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { companyHasFeature } from "@/lib/plan-access";
import { MAX_EXTENSION_DAYS } from "@/lib/rental-portal";
import { addDaysYmd, formatInTz, wallParts, wallYmd, zonedInstant } from "@/lib/tz";
import { formatCents } from "@/lib/money";

// Requests from the customer's private estimate link. They never change a rental directly: each one becomes a
// pending proposal that the office confirms on the Dispatch page, same as an AI-read reply.

type Result = { ok: true } | { ok: false; error: string };
type Kind = "PICKUP" | "EXTEND" | "SWAP";

const GENERIC = "We couldn't send that request. Please call us.";

async function load(token: string, bookingId: string) {
  if (!token || !bookingId) return null;
  const estimate = await prisma.estimate.findUnique({
    where: { publicToken: token },
    select: { id: true, jobId: true, companyId: true, company: { select: { name: true, email: true, timezone: true } }, customer: { select: { firstName: true, lastName: true } } },
  });
  if (!estimate?.jobId) return null;
  const booking = await prisma.rentalBooking.findFirst({
    where: { id: bookingId, companyId: estimate.companyId, jobId: estimate.jobId },
    include: { proposals: { where: { status: "PENDING" }, select: { kind: true } } },
  });
  if (!booking) return null;
  return { estimate, booking };
}

async function tellOffice(
  estimate: NonNullable<Awaited<ReturnType<typeof load>>>["estimate"],
  jobId: string,
  line: string,
) {
  if (!estimate.company.email) return;
  try {
    const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
    await sendEmail({
      to: estimate.company.email,
      fromName: estimate.company.name,
      companyId: estimate.companyId,
      subject: `Rental request from ${estimate.customer.firstName} ${estimate.customer.lastName}`,
      text: `${line}\n\nConfirm or ignore it on the Dispatch page: ${base}/dispatch\nJob: ${base}/jobs/${jobId}`,
    });
  } catch (err) {
    console.error("[rental request] office email failed", err);
  }
}

async function create(token: string, bookingId: string, kind: Kind, extra?: { days?: number }): Promise<Result> {
  if (!rateLimit(`rental-request:${await clientIp()}`, 20, 60 * 60_000).ok) return { ok: false, error: "Too many requests. Please call us." };
  const found = await load(token, bookingId);
  if (!found) return { ok: false, error: GENERIC };
  const { estimate, booking } = found;
  if (!(await companyHasFeature(estimate.companyId, "RENTALS"))) return { ok: false, error: GENERIC };
  if (booking.status !== "DELIVERED") {
    return { ok: false, error: booking.status === "PICKUP_REQUESTED" ? "A pickup is already requested for this dumpster." : "This dumpster isn't on site yet." };
  }
  if (booking.proposals.some((p) => p.kind === kind)) return { ok: true }; // already waiting on the office

  const tz = estimate.company.timezone;
  const who = `${estimate.customer.firstName} ${estimate.customer.lastName}`;
  const unit = booking.category ?? "dumpster";

  if (kind === "EXTEND") {
    const days = Math.floor(Number(extra?.days));
    if (!Number.isFinite(days) || days < 1 || days > MAX_EXTENSION_DAYS) return { ok: false, error: `Pick between 1 and ${MAX_EXTENSION_DAYS} extra days.` };
    const end = wallParts(booking.endAt, tz);
    const newEndAt = zonedInstant(addDaysYmd(wallYmd(booking.endAt, tz), days), end.hour, end.minute, tz);
    const item = booking.priceBookItemId
      ? await prisma.priceBookItem.findFirst({ where: { id: booking.priceBookItemId, companyId: estimate.companyId }, select: { extraDayCents: true } })
      : null;
    const priceCents = item?.extraDayCents ? item.extraDayCents * days : null;
    await prisma.rentalProposal.create({
      data: {
        companyId: estimate.companyId,
        bookingId: booking.id,
        kind,
        newEndAt,
        extraDays: days,
        priceCents,
        fromCustomer: true,
        message: `Asked on their rental page to keep it ${days} more day${days === 1 ? "" : "s"}.`,
      },
    });
    await tellOffice(estimate, booking.jobId, `${who} wants to keep the ${unit} for ${days} more day${days === 1 ? "" : "s"}, until ${formatInTz(newEndAt, tz, { weekday: "short", month: "short", day: "numeric" })}${priceCents ? ` (${formatCents(priceCents)} extra)` : ""}.`);
  } else {
    await prisma.rentalProposal.create({
      data: {
        companyId: estimate.companyId,
        bookingId: booking.id,
        kind,
        fromCustomer: true,
        message: kind === "PICKUP" ? "Asked on their rental page to have it picked up." : "Asked on their rental page to swap it for an empty one.",
      },
    });
    await tellOffice(estimate, booking.jobId, kind === "PICKUP" ? `${who} is done with the ${unit} and wants it picked up.` : `${who}'s ${unit} is full. They want it swapped for an empty one.`);
  }

  revalidatePath("/dispatch");
  revalidatePath(`/jobs/${booking.jobId}`);
  return { ok: true };
}

export async function requestPickup(token: string, bookingId: string): Promise<Result> {
  return create(token, bookingId, "PICKUP");
}

export async function requestSwap(token: string, bookingId: string): Promise<Result> {
  return create(token, bookingId, "SWAP");
}

export async function requestExtension(token: string, bookingId: string, days: number): Promise<Result> {
  return create(token, bookingId, "EXTEND", { days });
}
