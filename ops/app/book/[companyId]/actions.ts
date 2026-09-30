"use server";

import { prisma } from "@/lib/prisma";
import { slotsForDate, slotInstant, MAX_JOBS_PER_SLOT } from "@/lib/booking";
import { isValidYmd, addDaysYmd, startOfDayInTz, wallParts } from "@/lib/tz";
import { normalizePhoto, MAX_PHOTOS } from "@/lib/photos";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { notifyBooking } from "@/lib/booking-notify";

const RATE_LIMIT_MESSAGE = "We've received a lot of requests from your connection. Please try again in a little while, or call us to book.";

/** `ymd` is the calendar date the customer picked, as "YYYY-MM-DD". */
export async function getAvailableSlots(
  companyId: string,
  ymd: string,
): Promise<{ hour: number; label: string }[]> {
  // Availability lookups are cheap but unauthenticated; stop scripted scraping.
  if (!rateLimit(`slots:${await clientIp()}`, 120, 60_000).ok) return [];

  if (!isValidYmd(ymd)) return [];
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { timezone: true } });
  if (!company) return [];
  const tz = company.timezone;

  const daySlots = slotsForDate(ymd, tz);
  if (daySlots.length === 0) return [];

  const dayStart = startOfDayInTz(ymd, tz);
  const dayEnd = startOfDayInTz(addDaysYmd(ymd, 1), tz);

  const jobs = await prisma.job.findMany({
    where: { companyId, status: { not: "CANCELLED" }, scheduledAt: { gte: dayStart, lt: dayEnd } },
    select: { scheduledAt: true },
  });

  const countByHour = new Map<number, number>();
  for (const j of jobs) {
    if (!j.scheduledAt) continue;
    const h = wallParts(j.scheduledAt, tz).hour;
    countByHour.set(h, (countByHour.get(h) ?? 0) + 1);
  }

  return daySlots.filter((s) => (countByHour.get(s.hour) ?? 0) < MAX_JOBS_PER_SLOT);
}

export async function submitBooking(
  companyId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  // Honeypot: real visitors never see or fill this field; bots do. Pretend it
  // worked so they don't learn to skip it.
  if (String(formData.get("companyWebsite") || "").trim()) return { ok: true };

  // Loose limit on attempts (people mistype and retry); the strict limits on
  // bookings actually created come after validation, just before the insert.
  const ip = await clientIp();
  if (!rateLimit(`book-attempt:${ip}`, 30, 60 * 60_000).ok) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { ok: false, error: "This booking page isn't available." };

  const firstName = String(formData.get("firstName") || "").trim().slice(0, 80);
  const lastName = String(formData.get("lastName") || "").trim().slice(0, 80);
  const email = String(formData.get("email") || "").trim().toLowerCase().slice(0, 200);
  const phone = String(formData.get("phone") || "").trim().slice(0, 40);
  const addressLine1 = String(formData.get("address") || "").trim().slice(0, 200);
  const city = String(formData.get("city") || "").trim().slice(0, 100);
  const state = company.state || String(formData.get("state") || "").trim().slice(0, 40);
  const zip = String(formData.get("zip") || "").trim().slice(0, 20);
  const notes = String(formData.get("notes") || "").trim().slice(0, 2000);
  const ymd = String(formData.get("dateYmd") || "");
  const hour = Number(formData.get("hour"));

  if (!firstName || !lastName || !email || !phone || !addressLine1 || !city || !state || !zip) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!isValidYmd(ymd) || !Number.isInteger(hour)) {
    return { ok: false, error: "Please pick a date and time." };
  }
  // Only accept a slot we'd actually have offered (open day, in window, in hours, not too soon).
  if (!slotsForDate(ymd, company.timezone).some((s) => s.hour === hour)) {
    return { ok: false, error: "That time isn't available — please pick another." };
  }

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (photoFiles.length > MAX_PHOTOS) {
    return { ok: false, error: `Please attach at most ${MAX_PHOTOS} photos.` };
  }

  let photos: { filename: string; mimeType: string; dataUrl: string }[];
  try {
    photos = (await Promise.all(photoFiles.map(normalizePhoto))).filter((p) => p !== null);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not process the uploaded photos." };
  }

  const scheduledAt = slotInstant(ymd, hour, company.timezone);

  const conflictCount = await prisma.job.count({
    where: { companyId, scheduledAt, status: { not: "CANCELLED" } },
  });
  if (conflictCount >= MAX_JOBS_PER_SLOT) {
    return { ok: false, error: "That time slot was just booked by someone else — please pick another." };
  }

  // Everything valid — this counts as a real booking. Per-IP, per-email (one
  // email can't hold a pile of bookings from many IPs) and per-company caps.
  if (
    !rateLimit(`book-hour:${ip}`, 3, 60 * 60_000).ok ||
    !rateLimit(`book-day:${ip}`, 8, 24 * 60 * 60_000).ok ||
    !rateLimit(`book-email:${companyId}:${email}`, 3, 24 * 60 * 60_000).ok ||
    !rateLimit(`book-company:${companyId}`, 60, 60 * 60_000).ok
  ) {
    return { ok: false, error: RATE_LIMIT_MESSAGE };
  }

  let customer = await prisma.customer.findFirst({ where: { companyId, email } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { companyId, firstName, lastName, email, phone, source: "WEBSITE" },
    });
  }

  // A repeat customer booking the same address shouldn't grow duplicate properties.
  const property =
    (await prisma.property.findFirst({
      where: { companyId, customerId: customer.id, addressLine1: { equals: addressLine1, mode: "insensitive" }, zip },
    })) ??
    (await prisma.property.create({
      data: { companyId, customerId: customer.id, addressLine1, city, state, zip },
    }));

  const job = await prisma.job.create({
    data: {
      companyId,
      customerId: customer.id,
      propertyId: property.id,
      status: "SCHEDULED",
      scheduledAt,
      notes: notes || null,
    },
  });

  if (photos.length > 0) {
    await prisma.jobAttachment.createMany({
      data: photos.map((p) => ({
        companyId,
        jobId: job.id,
        filename: p.filename,
        mimeType: p.mimeType,
        dataUrl: p.dataUrl,
      })),
    });
  }

  // Never let a Mailgun/Twilio hiccup fail a booking that's already saved.
  await notifyBooking({
    companyId,
    customerId: customer.id,
    jobId: job.id,
    scheduledAt,
    photoCount: photos.length,
    notes: notes || null,
    address: `${addressLine1}, ${city}, ${state} ${zip}`,
  }).catch((err) => console.error("[booking] notify failed", err));

  return { ok: true };
}
