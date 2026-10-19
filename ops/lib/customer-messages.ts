import { prisma } from "@/lib/prisma";
import { sendEmail, MailgunNotConfiguredError } from "@/lib/mailgun";
import { SharedEmailExpiredError } from "@/lib/mail-config";
import { emailLimitMessage } from "@/lib/email-limits";
import { sendSms, toE164, TwilioNotConfiguredError } from "@/lib/twilio";
import { canSendText, recordTextSent } from "@/lib/plan-access";
import { COMPANY_PLAN_SELECT, PLATFORM_BRAND, isBranded } from "@/lib/plans";
import { formatCents } from "@/lib/money";
import { formatInTz } from "@/lib/tz";
import {
  TEMPLATES,
  buildEmailHtml,
  emailExtras,
  renderTemplateText,
  tidy,
  type TemplateContent,
  type TemplateKey,
  type Vars,
} from "@/lib/message-templates";

// Sends the editable customer messages (Settings > Customer requests). Each template has its own email and text
// switch; both can be on. Every message is logged in the customer's Conversation.

const origin = () => (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");

/** The company's saved template, or the built-in default. */
export async function loadTemplate(companyId: string, key: TemplateKey): Promise<TemplateContent> {
  const row = await prisma.messageTemplate.findUnique({ where: { companyId_key: { companyId, key } } });
  if (!row) return TEMPLATES[key].defaults;
  return { emailOn: row.emailOn, emailSubject: row.emailSubject, emailHeadline: row.emailHeadline, emailBody: row.emailBody, smsOn: row.smsOn, smsBody: row.smsBody };
}

/** Public URL of the company's logo (served by /api/logo), when it has one and its plan shows it. */
export function logoUrlFor(company: { id: string; logoDataUrl: string | null }, branded: boolean): string | null {
  return company.logoDataUrl && branded ? `${origin()}/api/logo/${company.id}` : null;
}

export interface SendResult {
  ok: boolean;
  sent: ("email" | "text")[];
  error?: string;
}

/** Renders and sends one template to a customer on whichever channels the template has switched on. */
export async function sendTemplateToCustomer(opts: {
  companyId: string;
  customerId: string;
  key: TemplateKey;
  vars: Vars;
  estimateId?: string | null;
}): Promise<SendResult> {
  const [company, customer, tpl] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: opts.companyId }, select: { id: true, name: true, email: true, phone: true, logoDataUrl: true, officeAddressLine1: true, officeCity: true, officeState: true, officeZip: true, ...COMPANY_PLAN_SELECT } }),
    prisma.customer.findFirst({ where: { id: opts.customerId, companyId: opts.companyId } }),
    loadTemplate(opts.companyId, opts.key),
  ]);
  if (!customer) return { ok: false, sent: [], error: "Customer not found." };

  const vars: Vars = { company_name: company.name, company_phone: company.phone ?? "", customer_name: customer.firstName, ...opts.vars };
  const sent: ("email" | "text")[] = [];
  const problems: string[] = [];
  const estimateId = opts.estimateId ?? undefined;

  if (tpl.emailOn && customer.email) {
    const limited = await emailLimitMessage(opts.companyId, customer.id);
    if (limited) {
      problems.push(limited);
    } else {
      const subject = tidy(renderTemplateText(tpl.emailSubject, vars)).replace(/\n/g, " ");
      const body = renderTemplateText(tpl.emailBody, vars);
      const address = [company.officeAddressLine1, [company.officeCity, company.officeState].filter(Boolean).join(", "), company.officeZip].filter(Boolean).join(" ");
      const html = buildEmailHtml({
        companyName: company.name,
        logoUrl: logoUrlFor(company, isBranded(company)),
        headline: tidy(renderTemplateText(tpl.emailHeadline, vars)),
        body,
        ...emailExtras(opts.key, vars),
        phone: company.phone,
        address: address || null,
        sentTo: customer.email,
        poweredBy: isBranded(company) ? null : PLATFORM_BRAND,
      });
      try {
        const { messageId } = await sendEmail({
          to: customer.email,
          fromName: company.name,
          companyId: opts.companyId,
          subject,
          text: tidy(body),
          html,
          replyThread: estimateId ? { kind: "estimate", id: estimateId } : undefined,
        });
        await prisma.communication.create({
          data: { companyId: opts.companyId, customerId: customer.id, estimateId, channel: "EMAIL", direction: "OUTBOUND", body: tidy(body), providerId: messageId },
        });
        sent.push("email");
      } catch (err) {
        if (err instanceof SharedEmailExpiredError) problems.push(err.message);
        else if (err instanceof MailgunNotConfiguredError) problems.push("Email isn't set up (Mailgun isn't configured).");
        else {
          console.error("[customer message] email failed", err);
          problems.push("The email couldn't be sent.");
        }
      }
    }
  }

  const to = toE164(customer.phone);
  if (tpl.smsOn && to && !customer.smsOptedOut && (await canSendText(opts.companyId))) {
    const text = tidy(renderTemplateText(tpl.smsBody, vars));
    try {
      const { sid } = await sendSms({ to, body: text });
      await prisma.communication.create({
        data: { companyId: opts.companyId, customerId: customer.id, estimateId, channel: "SMS", direction: "OUTBOUND", body: text, providerId: sid },
      });
      await recordTextSent(opts.companyId);
      sent.push("text");
    } catch (err) {
      if (err instanceof TwilioNotConfiguredError) problems.push("Texting isn't set up (Twilio isn't configured).");
      else {
        console.error("[customer message] text failed", err);
        problems.push("The text couldn't be sent.");
      }
    }
  }

  if (sent.length === 0 && problems.length === 0) problems.push("Nothing was sent: the customer has no email or mobile number for the channels this message uses, or it is switched off.");
  return { ok: sent.length > 0, sent, error: sent.length === 0 ? problems.join(" ") : undefined };
}

export type RequestKind = "PICKUP" | "EXTEND" | "SWAP";

const TYPE_WORD: Record<RequestKind, string> = { PICKUP: "pickup", EXTEND: "extension", SWAP: "swap-out" };

/** Everything a request message needs about a rental: the variables, the customer, and the estimate it belongs to. */
export async function buildRequestContext(
  bookingId: string,
  companyId: string,
  opts: { kind: RequestKind; newEndAt?: Date | null; extraDays?: number; chargeCents?: number | null; reason?: string },
) {
  const b = await prisma.rentalBooking.findFirstOrThrow({
    where: { id: bookingId, companyId },
    include: { job: { include: { customer: true, property: true, estimates: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, publicToken: true } } } } },
  });
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, phone: true, timezone: true } });
  const tz = company.timezone;
  const when = (d: Date) => `${formatInTz(d, tz, { weekday: "short", month: "short", day: "numeric" })}, ${formatInTz(d, tz, { hour: "numeric", minute: "2-digit" })}`;
  const p = b.job.property;
  const estimate = b.job.estimates[0] ?? null;
  const link = estimate?.publicToken ? `${origin()}/e/${estimate.publicToken}` : "";
  const charge = opts.chargeCents ? formatCents(opts.chargeCents) : "no charge";
  const asset = b.category ?? "dumpster";

  const days = opts.extraDays ?? 0;
  const requestDetails =
    opts.kind === "EXTEND" && opts.newEndAt
      ? `You asked to keep it ${days} more day${days === 1 ? "" : "s"}, until ${formatInTz(opts.newEndAt, tz, { weekday: "short", month: "short", day: "numeric" })}.`
      : opts.kind === "SWAP"
        ? "You asked us to swap it for an empty one."
        : "You asked us to pick it up.";
  const approvalDetails =
    opts.kind === "EXTEND" && opts.newEndAt
      ? `Your pickup is now ${when(opts.newEndAt)}.${opts.chargeCents ? ` The ${days} extra day${days === 1 ? "" : "s"} are ${formatCents(opts.chargeCents)} on your invoice.` : ""}`
      : opts.kind === "SWAP"
        ? `We'll swap it for an empty one and be in touch about timing.${opts.chargeCents ? ` The swap is ${formatCents(opts.chargeCents)} on your invoice.` : ""}`
        : "We'll be in touch about pickup timing.";

  const vars: Vars = {
    customer_name: b.job.customer.firstName,
    company_name: company.name,
    company_phone: company.phone ?? "",
    request_type: TYPE_WORD[opts.kind],
    asset_label: asset,
    service_address: p ? `${p.addressLine1}, ${p.city}` : "",
    pickup_date: when(b.endAt),
    new_pickup_date: opts.newEndAt ? when(opts.newEndAt) : "",
    extra_days: days ? String(days) : "",
    charge,
    request_details: requestDetails,
    approval_details: approvalDetails,
    reason: opts.reason?.trim() || "Please call us and we'll help.",
    rental_link: link,
  };
  return { vars, customerId: b.job.customerId, estimateId: estimate?.id ?? null, jobId: b.jobId };
}
