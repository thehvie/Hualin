/**
 * Single source of truth for invoice money math. Used by the invoice editor, the
 * invoices list, the emailed invoice, and the public client-facing view so every
 * surface shows the same numbers.
 *
 * All amounts are integer cents. Tax rates are basis points (650 = 6.5%).
 */

export interface TotalsLineItem {
  quantity: number;
  unitPriceCents: number;
  costCents?: number | null;
  taxable?: boolean;
}

export interface InvoiceTotalsInput {
  lineItems: TotalsLineItem[];
  discountCents: number;
  tipCents: number;
  taxRateBps: number;
  payments: { amountCents: number }[];
}

export interface InvoiceTotals {
  subtotalCents: number;
  itemCostCents: number;
  discountCents: number;
  taxableBaseCents: number;
  taxCents: number;
  tipCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
}

export function computeInvoiceTotals({
  lineItems,
  discountCents,
  tipCents,
  taxRateBps,
  payments,
}: InvoiceTotalsInput): InvoiceTotals {
  const subtotalCents = lineItems.reduce(
    (sum, li) => sum + li.quantity * li.unitPriceCents,
    0,
  );
  const itemCostCents = lineItems.reduce((sum, li) => sum + (li.costCents ?? 0), 0);
  const taxableSubtotalCents = lineItems.reduce(
    (sum, li) => (li.taxable ? sum + li.quantity * li.unitPriceCents : sum),
    0,
  );

  const discount = Math.min(Math.max(discountCents, 0), subtotalCents);

  // Discount reduces the taxable base proportionally to how much of the subtotal is taxable.
  const discountShareOnTaxable =
    subtotalCents > 0 ? Math.round((discount * taxableSubtotalCents) / subtotalCents) : 0;
  const taxableBaseCents = Math.max(0, taxableSubtotalCents - discountShareOnTaxable);

  const taxCents = Math.round((taxableBaseCents * Math.max(taxRateBps, 0)) / 10000);
  const tip = Math.max(tipCents, 0);

  const totalCents = subtotalCents - discount + taxCents + tip;
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const balanceCents = totalCents - paidCents;

  return {
    subtotalCents,
    itemCostCents,
    discountCents: discount,
    taxableBaseCents,
    taxCents,
    tipCents: tip,
    totalCents,
    paidCents,
    balanceCents,
  };
}
