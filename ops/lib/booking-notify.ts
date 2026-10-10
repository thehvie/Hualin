import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailgun";
import { sendSms, toE164 } from "@/lib/twilio";
import { formatInTz } from "@/lib/tz";

interface BookingNotice {
  companyId: string;
  customerId: string;
  jobId: string;
  scheduledAt: Date;
  photoCount: number;
  notes: string | null;
  address: string;
}

const whenLong = (d: Date, tz: string) =>
  formatInTz(d, tz, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
const whenShort = (d: Date, tz: string) =>
  formatInTz(d, tz, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Confirms a new online booking to the customer (email + text) and alerts the
 * business. Strictly best-effort: the booking is already saved, so a failing
 * Mailgun/Twilio call must never turn into an error for the customer.
 */
export async function notifyBooking(n: BookingNotice): Promise<void> {
  const [company, customer] = await Promise.all([
    prisma.company.findUnique({ where: { id: n.companyId } }),
    prisma.customer.findUnique({ where: { id: n.customerId } }),
  ]);
  if (!company || !customer) return;

  const tz = company.timezone;
  const when = whenLong(n.scheduledAt, tz);
  const origin = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");

  // 1. Email the customer.
  if (customer.email) {
    const text = [
      `Hi ${customer.firstName},`,
      "",
      `You're booked with ${company.name}.`,
      "",
      `When: ${when}`,
      `Where: ${n.address}`,
      "",
      "If you need to change or cancel, just reply to this email" + (company.phone ? ` or call ${company.phone}.` : "."),
      "",
      `Thanks,\n${company.name}`,
    ].join("\n");
    try {
      await sendEmail({
        to: customer.email,
        fromName: company.name,
        replyTo: company.email ?? undefined,
        companyId: n.companyId,
        subject: `You're booked with ${company.name} — ${whenShort(n.scheduledAt, tz)}`,
        text,
      });
      await prisma.communication.create({
        data: { companyId: n.companyId, customerId: n.customerId, channel: "EMAIL", direction: "OUTBOUND", body: text },
      });
    } catch (err) {
      console.error("[booking] customer confirmation email failed", err);
    }
  }

  // 2. Text the customer (they gave their number on the form, with consent copy).
  const to = toE164(customer.phone);
  if (to && !customer.smsOptedOut) {
    const body = `${company.name}: you're booked for ${whenShort(n.scheduledAt, tz)} at ${n.address}. Reply STOP to opt out.`;
    try {
      const { sid } = await sendSms({ to, body });
      await prisma.communication.create({
        data: { companyId: n.companyId, customerId: n.customerId, channel: "SMS", direction: "OUTBOUND", body, providerId: sid },
      });
    } catch (err) {
      console.error("[booking] customer confirmation text failed", err);
    }
  }

  // 3. Alert the business.
  if (company.email) {
    const text = [
      "New online booking",
      "",
      `${customer.firstName} ${customer.lastName}`,
      customer.phone ?? "",
      customer.email ?? "",
      "",
      `When: ${when}`,
      `Where: ${n.address}`,
      n.photoCount > 0 ? `Photos attached: ${n.photoCount}` : "No photos attached",
      n.notes ? `\nNotes: ${n.notes}` : "",
      "",
      `Open the job: ${origin}/jobs/${n.jobId}`,
    ]
      .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
      .join("\n");
    try {
      await sendEmail({
        to: company.email,
        fromName: "Online booking",
        subject: `New booking: ${customer.firstName} ${customer.lastName} — ${whenShort(n.scheduledAt, tz)}`,
        text,
      });
    } catch (err) {
      console.error("[booking] business alert email failed", err);
    }
  }
}
