import { prisma } from "@/lib/prisma";
import { messageChannel } from "@/lib/messaging";
import { sendSms, toE164, TwilioNotConfiguredError } from "@/lib/twilio";
import { sendEmail, MailgunNotConfiguredError } from "@/lib/mailgun";
import { SharedEmailExpiredError } from "@/lib/mail-config";
import { emailLimitMessage } from "@/lib/email-limits";

export type SendResult = { ok: true; channel: "sms" | "email" } | { ok: false; error: string };

/**
 * Sends one message to a customer on behalf of a company without a signed-in user (reminders, confirmations).
 * Texts when possible, otherwise emails, and logs it in the Conversation like any other message.
 */
export async function sendToCustomer(opts: {
  companyId: string;
  customerId: string;
  body: string;
  subject: string;
  estimateId?: string | null;
}): Promise<SendResult> {
  const customer = await prisma.customer.findFirst({
    where: { id: opts.customerId, companyId: opts.companyId },
    include: { company: { select: { name: true } } },
  });
  if (!customer) return { ok: false, error: "Customer not found." };
  const channel = messageChannel(customer);
  if (!channel) return { ok: false, error: "No usable phone number or email address on file." };
  const estimateId = opts.estimateId ?? undefined;

  if (channel === "sms") {
    const to = toE164(customer.phone);
    if (!to) return { ok: false, error: "No valid mobile number on file." };
    let sid: string | null = null;
    try {
      ({ sid } = await sendSms({ to, body: opts.body }));
    } catch (err) {
      if (err instanceof TwilioNotConfiguredError) return { ok: false, error: "Texting isn't set up (Twilio isn't configured)." };
      console.error("[outbound] sms failed", err);
      return { ok: false, error: "The text couldn't be sent." };
    }
    await prisma.communication.create({
      data: { companyId: opts.companyId, customerId: customer.id, estimateId, channel: "SMS", direction: "OUTBOUND", body: opts.body, providerId: sid },
    });
    return { ok: true, channel };
  }

  const limited = await emailLimitMessage(opts.companyId, customer.id);
  if (limited) return { ok: false, error: limited };
  let messageId: string | null = null;
  try {
    ({ messageId } = await sendEmail({
      to: customer.email!,
      fromName: customer.company.name,
      companyId: opts.companyId,
      subject: opts.subject,
      text: opts.body,
      replyThread: estimateId ? { kind: "estimate", id: estimateId } : undefined,
    }));
  } catch (err) {
    if (err instanceof SharedEmailExpiredError) return { ok: false, error: err.message };
    if (err instanceof MailgunNotConfiguredError) return { ok: false, error: "Email isn't set up (Mailgun isn't configured)." };
    console.error("[outbound] email failed", err);
    return { ok: false, error: "The email couldn't be sent." };
  }
  await prisma.communication.create({
    data: { companyId: opts.companyId, customerId: customer.id, estimateId, channel: "EMAIL", direction: "OUTBOUND", body: opts.body, providerId: messageId },
  });
  return { ok: true, channel };
}
