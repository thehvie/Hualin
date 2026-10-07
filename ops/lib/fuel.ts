// Fuel surcharge: charged per mile beyond a number of free miles, normally on the round trip.
export interface FuelSettings {
  rateCentsPerMile: number;
  freeMiles: number;
  roundTrip: boolean;
}

export const FUEL_LINE_PREFIX = "Fuel surcharge";

export function fuelSurcharge(oneWayMiles: number, s: FuelSettings) {
  const billableOneWay = Math.max(0, oneWayMiles - s.freeMiles);
  const billableMiles = billableOneWay * (s.roundTrip ? 2 : 1);
  return { billableMiles, cents: Math.round(billableMiles * s.rateCentsPerMile) };
}

export function fuelLineDescription(oneWayMiles: number, s: FuelSettings): string {
  const { billableMiles } = fuelSurcharge(oneWayMiles, s);
  return `${FUEL_LINE_PREFIX} (${billableMiles.toFixed(1)} mi${s.roundTrip ? " round trip" : ""})`;
}
