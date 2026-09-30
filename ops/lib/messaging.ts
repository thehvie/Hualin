import { toE164, twilioConfigured } from "@/lib/twilio";

/** Which channel the Conversation composer will use for this customer. */
export function messageChannel(customer: {
  phone: string | null;
  email: string | null;
  smsOptedOut: boolean;
}): "sms" | "email" | null {
  if (twilioConfigured() && !customer.smsOptedOut && toE164(customer.phone)) return "sms";
  if (customer.email) return "email";
  return null;
}
