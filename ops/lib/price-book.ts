export const PRICE_BOOK_TYPE_LABELS: Record<string, string> = {
  SERVICE: "Service",
  MATERIAL: "Product",
  RENTAL: "Rental",
};

// Rental line items are priced per day, and their quantity is the number of days.
export function formatQty(quantity: number, isRental: boolean): string {
  return isRental ? `${quantity} ${quantity === 1 ? "day" : "days"}` : String(quantity);
}

export function formatUnitPrice(formattedPrice: string, isRental: boolean): string {
  return isRental ? `${formattedPrice}/day` : formattedPrice;
}
