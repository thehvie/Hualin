// Customer message templates (email and text) and the branded HTML email layout. Pure functions with no server
// imports, so the Settings preview can render exactly what customers receive.

export type TemplateKey = "REQUEST_RECEIVED" | "REQUEST_APPROVED" | "REQUEST_DECLINED";

export interface TemplateContent {
  emailOn: boolean;
  emailSubject: string;
  emailHeadline: string;
  emailBody: string;
  smsOn: boolean;
  smsBody: string;
}

export interface TemplateDef {
  key: TemplateKey;
  label: string;
  when: string;
  defaults: TemplateContent;
}

export const TEMPLATE_KEYS: TemplateKey[] = ["REQUEST_RECEIVED", "REQUEST_APPROVED", "REQUEST_DECLINED"];

/** Variables a template can use, written {{name}}. */
export const TEMPLATE_VARIABLES: { name: string; label: string }[] = [
  { name: "customer_name", label: "Customer's first name" },
  { name: "company_name", label: "Your company name" },
  { name: "company_phone", label: "Your phone number" },
  { name: "request_type", label: "pickup, extension or swap-out" },
  { name: "asset_label", label: "The dumpster, like 20 yard dumpster" },
  { name: "service_address", label: "Where the dumpster is" },
  { name: "pickup_date", label: "Current pickup date and time" },
  { name: "new_pickup_date", label: "New pickup date (extensions)" },
  { name: "extra_days", label: "Extra days asked for" },
  { name: "charge", label: "What it costs, or no charge" },
  { name: "request_details", label: "One line about what was asked" },
  { name: "approval_details", label: "One line about what happens next" },
  { name: "reason", label: "Why it was declined" },
  { name: "rental_link", label: "Link to their rental page" },
];

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  REQUEST_RECEIVED: {
    key: "REQUEST_RECEIVED",
    label: "Request received",
    when: "Sent to the customer right after they ask for a pickup, extension or swap on their rental page.",
    defaults: {
      emailOn: true,
      emailSubject: "We got your {{request_type}} request",
      emailHeadline: "We got your request",
      emailBody:
        "Hi {{customer_name}},\n\nThanks! {{company_name}} received your {{request_type}} request for your {{asset_label}} at {{service_address}}.\n\n{{request_details}}\n\nWe look at every request and will confirm shortly. Need to reach us? Call {{company_phone}}.",
      smsOn: false,
      smsBody: "{{company_name}}: we got your {{request_type}} request for your {{asset_label}}. We'll confirm shortly. {{rental_link}}",
    },
  },
  REQUEST_APPROVED: {
    key: "REQUEST_APPROVED",
    label: "Request approved",
    when: "Sent when you confirm a request on the Dispatch page.",
    defaults: {
      emailOn: true,
      emailSubject: "Your {{request_type}} request is confirmed",
      emailHeadline: "You're all set",
      emailBody:
        "Hi {{customer_name}},\n\nGood news: your {{request_type}} request for the {{asset_label}} at {{service_address}} is confirmed.\n\n{{approval_details}}\n\nQuestions? Call us at {{company_phone}}.\n\nThank you,\n{{company_name}}",
      smsOn: false,
      smsBody: "{{company_name}}: your {{request_type}} request is confirmed. {{approval_details}}",
    },
  },
  REQUEST_DECLINED: {
    key: "REQUEST_DECLINED",
    label: "Request declined",
    when: "Sent when you decline a request on the Dispatch page.",
    defaults: {
      emailOn: true,
      emailSubject: "About your {{request_type}} request",
      emailHeadline: "We couldn't approve your request",
      emailBody:
        "Hi {{customer_name}},\n\nWe're sorry, but we can't approve your {{request_type}} request for the {{asset_label}} at {{service_address}}.\n\nReason: {{reason}}\n\nPlease call us at {{company_phone}} and we'll sort it out.\n\n{{company_name}}",
      smsOn: false,
      smsBody: "{{company_name}}: we couldn't approve your {{request_type}} request. {{reason}} Please call {{company_phone}}.",
    },
  },
};

export type Vars = Record<string, string | undefined>;

export const SAMPLE_VARS: Record<string, string> = {
  customer_name: "Alex",
  company_name: "Your Company",
  company_phone: "(555) 123-4567",
  request_type: "extension",
  asset_label: "20 yard dumpster",
  service_address: "123 Main St, Orlando, FL",
  pickup_date: "Fri, Oct 16, 2:00 PM",
  new_pickup_date: "Mon, Oct 19, 2:00 PM",
  extra_days: "3",
  charge: "$75.00",
  request_details: "You asked to keep it 3 more days, until Mon, Oct 19.",
  approval_details: "Your pickup is now Mon, Oct 19, 2:00 PM. The 3 extra days are $75.00 on your invoice.",
  reason: "That dumpster is booked by another customer.",
  rental_link: "https://example.com/e/your-rental-link",
};

/** Replaces {{name}} with its value; unknown or empty names become empty. */
export function renderTemplateText(text: string, vars: Vars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, name: string) => (vars as Record<string, string | undefined>)[name] ?? "");
}

/** Tidy up after empty variables left blank lines or doubled spaces. */
export function tidy(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function bodyToHtml(text: string, linkColor: string): string {
  const linked = (s: string) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:${linkColor};text-decoration:underline">${u}</a>`);
  return tidy(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#27272a">${linked(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export interface EmailLayout {
  companyName: string;
  /** Public URL of the company's logo, or null to show the company name instead. */
  logoUrl: string | null;
  headline: string;
  body: string;
  details: { label: string; value: string }[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  sentTo?: string | null;
  /** Platform name for the Powered by line; null when the company has paid for branding. */
  poweredBy?: string | null;
}

export function detailsFromVars(vars: Vars): { label: string; value: string }[] {
  const rows: [string, string | undefined][] = [
    ["Rental", vars.asset_label],
    ["Address", vars.service_address],
    ["Pickup", vars.new_pickup_date || vars.pickup_date],
  ];
  return rows.filter((r): r is [string, string] => !!r[1]).map(([label, value]) => ({ label, value }));
}

const ACCENT = "#ff6b35";
const INK = "#18181b";

/** The branded email: logo and button across the top, headline, a details card, the message, then a footer. */
export function buildEmailHtml(l: EmailLayout): string {
  const logo = l.logoUrl
    ? `<img src="${esc(l.logoUrl)}" alt="${esc(l.companyName)}" height="56" style="display:block;border:0;max-height:56px;max-width:200px;height:auto">`
    : `<span style="font-size:20px;font-weight:700;color:${INK}">${esc(l.companyName)}</span>`;
  const cta = l.ctaUrl && l.ctaLabel ? { url: esc(l.ctaUrl), label: esc(l.ctaLabel.toUpperCase()) } : null;
  const topButton = cta
    ? `<a href="${cta.url}" style="display:inline-block;border:2px solid ${ACCENT};border-radius:6px;padding:10px 18px;font-size:14px;font-weight:700;color:${ACCENT};text-decoration:none">${cta.label}</a>`
    : "";
  const bigButton = cta
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:20px auto 24px"><tr><td style="background:${ACCENT};border-radius:6px"><a href="${cta.url}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${cta.label}</a></td></tr></table>`
    : "";
  const details = l.details.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;border-radius:8px;margin:0 0 24px"><tr><td style="padding:16px 20px">${l.details
        .map((d) => `<p style="margin:0 0 6px;font-size:15px;line-height:22px;color:#27272a"><strong style="color:${INK}">${esc(d.label)}:</strong> ${esc(d.value)}</p>`)
        .join("")}</td></tr></table>`
    : "";
  const footerLines = [
    l.phone ? `Questions? Call <a href="tel:${esc(l.phone.replace(/[^\d+]/g, ""))}" style="color:${ACCENT};text-decoration:none">${esc(l.phone)}</a>` : "",
    l.address ? esc(l.address) : "",
    l.sentTo ? `This email was sent to ${esc(l.sentTo)} by ${esc(l.companyName)}.` : "",
    l.poweredBy ? `Powered by ${esc(l.poweredBy)}` : "",
  ].filter(Boolean);

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(l.headline)}</title></head>
<body style="margin:0;padding:0;background:#e4e4e7;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e4e4e7"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff">
<tr><td style="padding:24px 32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" valign="middle">${logo}</td><td align="right" valign="middle">${topButton}</td></tr></table></td></tr>
<tr><td style="padding:0 32px"><div style="border-top:1px solid #e4e4e7"></div></td></tr>
<tr><td align="center" style="padding:32px 32px 8px"><h1 style="margin:0;font-size:28px;line-height:34px;font-weight:700;color:${INK}">${esc(l.headline)}</h1></td></tr>
<tr><td style="padding:16px 32px 0">${details}${bodyToHtml(l.body, ACCENT)}${bigButton}</td></tr>
<tr><td style="background:#fafafa;padding:20px 32px;text-align:center;font-size:13px;line-height:20px;color:#71717a">${footerLines.map((x) => `<p style="margin:0 0 6px">${x}</p>`).join("")}</td></tr>
</table></td></tr></table></body></html>`;
}
