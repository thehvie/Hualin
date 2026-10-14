import { prisma } from "@/lib/prisma";
import { askJson } from "@/lib/openrouter";
import { getUsageStatus } from "@/lib/usage";
import { messageChannel } from "@/lib/messaging";
import { sendToCustomer } from "@/lib/outbound";
import { formatInTz, wallParts } from "@/lib/tz";
import { formatCents } from "@/lib/money";

const HOUR = 3_600_000;
const MAX_PER_COMPANY_PER_RUN = 40;

export type ReminderKind = "MAIN" | "SHORT";
export const SHORT_REMINDER_HOURS = 2;

/** Hours before the planned pickup at which each kind goes out. */
export function reminderLeadHours(kind: ReminderKind, mainHours: number): number {
  return kind === "MAIN" ? mainHours : SHORT_REMINDER_HOURS;
}

/**
 * Which reminder a rental gets. A rental longer than the lead time gets the main one (default 24 h before pickup);
 * a rental of that length or shorter would be "due" before it even starts, so it gets the short one (2 h before).
 */
export function reminderKindFor(startAt: Date, endAt: Date, mainHours: number): ReminderKind {
  return endAt.getTime() - startAt.getTime() > mainHours * HOUR ? "MAIN" : "SHORT";
}

/** True when it's inside the company's allowed sending hours (start inclusive, end exclusive, local time). */
export function insideSendingHours(now: Date, tz: string, startHour: number, endHour: number): boolean {
  const h = wallParts(now, tz).hour;
  return startHour <= endHour ? h >= startHour && h < endHour : h >= startHour || h < endHour;
}

interface Facts {
  firstName: string;
  company: string;
  size: string;
  pickup: string; // "Wed, Oct 15 at 9:00 AM"
  extraDay: string | null; // "$25.00"
  channel: "sms" | "email";
}

export function templateMessage(f: Facts): { subject: string; body: string } {
  const rate = f.extraDay ? ` Extra days are ${f.extraDay} each.` : "";
  const body =
    f.channel === "sms"
      ? `Hi ${f.firstName}, ${f.company} here. Your ${f.size} dumpster is scheduled for pickup ${f.pickup}.${rate} Need more time? Reply with how long you'd like (like "keep it till Friday"). Done early? Reply READY.`
      : `Hi ${f.firstName},\n\nThis is a reminder from ${f.company} that your ${f.size} dumpster is scheduled for pickup ${f.pickup}.\n\nNeed more time? Just reply to this email with how long you'd like (for example "keep it till Friday").${rate}\nAlready done? Reply READY and we'll schedule the pickup.\n\nThank you,\n${f.company}`;
  return { subject: `Your dumpster pickup is ${f.pickup}`, body };
}

/** AI-written wording. Falls back to the template when AI is off, paused, fails, or leaves out the pickup time. */
async function writeMessage(companyId: string, useAi: boolean, f: Facts): Promise<{ subject: string; body: string; usedAi: boolean }> {
  const fallback = { ...templateMessage(f), usedAi: false };
  if (!useAi || !process.env.OPENROUTER_API_KEY) return fallback;
  try {
    if ((await getUsageStatus(companyId)).capped) return fallback;
    const limit = f.channel === "sms" ? "Under 280 characters, one short paragraph." : "Under 120 words, a short friendly email body with a greeting and sign-off.";
    const parsed = await askJson(
      `You write short customer reminders for a dumpster rental company. Write ONE ${f.channel === "sms" ? "text message" : "email"} to the customer.

Facts (use them exactly, do not invent anything else):
- Customer first name: ${f.firstName}
- Company: ${f.company}
- Dumpster: ${f.size}
- Scheduled pickup: ${f.pickup}
${f.extraDay ? `- Price of each extra day: ${f.extraDay}` : "- Extra day price: not set (do not mention a price)"}

It must: say the pickup time exactly as written above; tell them they can reply with how much longer they need (for example "keep it till Friday") to extend; tell them to reply READY if they are done early. Warm and plain, no emojis, no links, no promises beyond this. ${limit}

Respond with ONLY a JSON object: {"message": string}`,
      companyId,
      "RENTAL_MESSAGE",
    );
    const text = typeof parsed.message === "string" ? parsed.message.trim() : "";
    if (text.length < 20 || text.length > 900 || (f.channel === "sms" && text.length > 480) || !text.includes(f.pickup)) return fallback;
    return { subject: fallback.subject, body: text, usedAi: true };
  } catch (err) {
    console.error("[rental reminders] AI wording failed, using template", err);
    return fallback;
  }
}

/** "Wed, Oct 15 at 9:00 AM" in the company's timezone. */
export function whenText(d: Date, tz: string): string {
  return `${formatInTz(d, tz, { weekday: "short", month: "short", day: "numeric" })} at ${formatInTz(d, tz, { hour: "numeric", minute: "2-digit" })}`;
}

export interface ReminderRunSummary {
  companies: number;
  created: number;
  sent: number;
  drafted: number;
  skipped: number;
}

/** Facts and the finished message for one rental, for drafting or sending a reminder. */
async function buildReminder(
  booking: {
    category: string | null;
    endAt: Date;
    priceBookItemId: string | null;
    job: { customer: { firstName: string; phone: string | null; email: string | null; smsOptedOut: boolean } };
  },
  company: { id: string; name: string; timezone: string; rentalReminderAi: boolean },
) {
  const item = booking.priceBookItemId
    ? await prisma.priceBookItem.findFirst({ where: { id: booking.priceBookItemId, companyId: company.id }, select: { extraDayCents: true } })
    : null;
  const channel = messageChannel(booking.job.customer) ?? "email";
  const facts: Facts = {
    firstName: booking.job.customer.firstName,
    company: company.name,
    size: booking.category ?? "rental",
    pickup: whenText(booking.endAt, company.timezone),
    extraDay: item?.extraDayCents ? formatCents(item.extraDayCents) : null,
    channel,
  };
  return { channel, ...(await writeMessage(company.id, company.rentalReminderAi, facts)) };
}

/** Sends a stored reminder now. Used for automatic sending and for the owner's approval. */
export async function deliverReminder(reminderId: string, override?: { body?: string }): Promise<{ ok: boolean; error?: string }> {
  const r = await prisma.rentalReminder.findUnique({
    where: { id: reminderId },
    include: { booking: { include: { job: { include: { estimates: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true } } } } } } },
  });
  if (!r) return { ok: false, error: "Reminder not found." };
  if (r.status !== "DRAFT") return { ok: false, error: "This reminder has already been handled." };
  const booking = r.booking;
  // A pickup that has been requested or done makes the reminder pointless.
  if (booking.status !== "DELIVERED") {
    await prisma.rentalReminder.update({ where: { id: r.id }, data: { status: "SKIPPED", note: "Rental is no longer out on site." } });
    return { ok: false, error: "This rental is no longer out on site, so the reminder was skipped." };
  }
  const body = (override?.body ?? r.body).trim();
  if (!body) return { ok: false, error: "The message is empty." };
  const res = await sendToCustomer({
    companyId: r.companyId,
    customerId: booking.job.customerId,
    body,
    subject: "Your dumpster pickup is coming up",
    estimateId: booking.job.estimates[0]?.id ?? null,
  });
  if (res.ok) {
    await prisma.rentalReminder.update({ where: { id: r.id }, data: { status: "SENT", sentAt: new Date(), channel: res.channel, body } });
    return { ok: true };
  }
  await prisma.rentalReminder.update({ where: { id: r.id }, data: { status: "SKIPPED", note: res.error } });
  return { ok: false, error: res.error };
}

/**
 * The scheduled pass (every 15 minutes): for each company with reminders on, finds dumpsters out on site whose pickup
 * is coming up, and drafts a reminder (or sends it, in automatic mode). Rules decide when; the AI only words it.
 */
export async function runRentalReminders(now = new Date()): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = { companies: 0, created: 0, sent: 0, drafted: 0, skipped: 0 };
  const companies = await prisma.company.findMany({
    where: { rentalRemindersOn: true },
    select: {
      id: true,
      name: true,
      timezone: true,
      rentalReminderHours: true,
      rentalReminderAuto: true,
      rentalReminderAi: true,
      rentalQuietStartHour: true,
      rentalQuietEndHour: true,
    },
  });

  for (const company of companies) {
    summary.companies++;

    // Drafts nobody approved before the pickup time are stale.
    await prisma.rentalReminder.updateMany({
      where: { companyId: company.id, status: "DRAFT", forEndAt: { lt: now } },
      data: { status: "DISMISSED", note: "Expired before it was approved." },
    });

    if (!insideSendingHours(now, company.timezone, company.rentalQuietStartHour, company.rentalQuietEndHour)) continue;

    const horizon = new Date(now.getTime() + Math.max(company.rentalReminderHours, SHORT_REMINDER_HOURS) * HOUR);
    const bookings = await prisma.rentalBooking.findMany({
      where: { companyId: company.id, status: "DELIVERED", endAt: { gt: now, lte: horizon } },
      include: {
        job: { include: { customer: true } },
        proposals: { where: { status: "PENDING", kind: "EXTEND" }, select: { id: true } },
      },
      orderBy: { endAt: "asc" },
    });

    let made = 0;
    for (const b of bookings) {
      if (made >= MAX_PER_COMPANY_PER_RUN) break;
      if (b.proposals.length > 0) continue; // an extension is waiting for the owner; don't nag
      const kind = reminderKindFor(b.startAt, b.endAt, company.rentalReminderHours);
      const dueAt = b.endAt.getTime() - reminderLeadHours(kind, company.rentalReminderHours) * HOUR;
      if (now.getTime() < dueAt) continue;
      // Delivered after the reminder would have gone out: the customer was only just told the pickup date.
      if (b.deliveredAt && b.deliveredAt.getTime() > dueAt) continue;

      const exists = await prisma.rentalReminder.findUnique({
        where: { bookingId_kind_forEndAt: { bookingId: b.id, kind, forEndAt: b.endAt } },
        select: { id: true },
      });
      if (exists) continue;

      if (!messageChannel(b.job.customer)) {
        await prisma.rentalReminder.create({
          data: { companyId: company.id, bookingId: b.id, kind, forEndAt: b.endAt, status: "SKIPPED", body: "", note: "Customer has no phone or email on file." },
        });
        summary.skipped++;
        continue;
      }

      const msg = await buildReminder(b, company);
      let reminder;
      try {
        reminder = await prisma.rentalReminder.create({
          data: { companyId: company.id, bookingId: b.id, kind, forEndAt: b.endAt, status: "DRAFT", channel: msg.channel, body: msg.body },
        });
      } catch {
        continue; // another run got there first
      }
      made++;
      summary.created++;
      if (company.rentalReminderAuto) {
        const res = await deliverReminder(reminder.id);
        if (res.ok) summary.sent++;
        else summary.skipped++;
      } else {
        summary.drafted++;
      }
    }
  }
  return summary;
}
