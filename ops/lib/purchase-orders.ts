export const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

export const PO_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SENT: "bg-amber-100 text-amber-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

export function poTotalCents(lineItems: { costCents: number; quantity: number }[]): number {
  return lineItems.reduce((sum, li) => sum + li.costCents * li.quantity, 0);
}

export function formatVendorAddress(v: { addressLine1: string | null; city: string | null; state: string | null; zip: string | null }) {
  const cityLine = [v.city, [v.state, v.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [v.addressLine1, cityLine].filter(Boolean).join(", ");
}
