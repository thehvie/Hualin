export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function lineItemsTotal(lineItems: { quantity: number; unitPriceCents: number }[]) {
  return lineItems.reduce((sum, li) => sum + li.quantity * li.unitPriceCents, 0);
}
