export const HOME_BASE_ADDRESS = "1375 Lake Shadow Cir, Maitland, FL 32751";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
}

let homeBaseCache: GeocodeResult | null = null;

/**
 * Geocodes a plain-text address via Google's Geocoding API.
 * Returns null (rather than throwing) if GOOGLE_MAPS_API_KEY isn't set or the
 * lookup fails, so callers can degrade gracefully instead of crashing pages.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address.trim()) return null;

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.status !== "OK" || !data.results?.[0]?.geometry?.location) {
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng };
  } catch {
    return null;
  }
}

export async function getHomeBaseLocation(): Promise<GeocodeResult | null> {
  if (homeBaseCache) return homeBaseCache;
  const result = await geocodeAddress(HOME_BASE_ADDRESS);
  if (result) homeBaseCache = result;
  return result;
}

/**
 * Straight-line (haversine) distance in miles between two coordinates.
 * Not driving distance -- a quick reference estimate only.
 */
export function haversineDistanceMiles(a: GeocodeResult, b: GeocodeResult): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}
