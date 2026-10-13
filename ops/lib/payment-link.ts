// A company's own payment page (Square, a Stripe payment link, PayPal, Venmo business, …) that customers are sent to.

export const DEFAULT_PAYMENT_LABEL = "Pay online";

/** Turns what was typed into a safe web address, or null. Only http(s) links are accepted (never javascript: and the like). */
export function normalizePaymentUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export interface PaymentLinkSettings {
  paymentLinkUrl: string | null;
  paymentLinkLabel: string | null;
  paymentLinkOnEstimates: boolean;
  paymentLinkOnInvoices: boolean;
}

/** The link to show on this kind of document, or null if none is set or it's switched off for that document. */
export function companyPaymentLink(c: PaymentLinkSettings, kind: "estimate" | "invoice"): { url: string; label: string } | null {
  if (!c.paymentLinkUrl) return null;
  if (kind === "estimate" ? !c.paymentLinkOnEstimates : !c.paymentLinkOnInvoices) return null;
  return { url: c.paymentLinkUrl, label: c.paymentLinkLabel?.trim() || DEFAULT_PAYMENT_LABEL };
}
