import { prisma } from "@/lib/prisma";
import { geocodeAddress, haversineDistanceMiles } from "@/lib/geocode";
import { GOOGLE_COST_MICROS, getUsageStatus, recordUsage } from "@/lib/usage";

export interface MapPoint {
  label: string;
  latitude: number | null;
  longitude: number | null;
}

export interface DriveRoute {
  distanceMiles: number;
  durationMinutes: number;
  /** Route line as [lat, lng] pairs, for drawing on the map. */
  path: [number, number][];
}

export interface RouteInfo {
  office: MapPoint | null;
  destination: MapPoint | null;
  straightMiles: number | null;
  drive: DriveRoute | null;
  /** True when the company's monthly usage cap is reached and map features are paused. */
  paused: boolean;
}

/** The company's office (Settings), geocoded once and cached on the company row. */
export async function getOfficePoint(companyId: string): Promise<MapPoint | null> {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { officeAddressLine1: true, officeCity: true, officeState: true, officeZip: true, officeLatitude: true, officeLongitude: true },
  });
  if (!c?.officeAddressLine1) return null;

  const label = [c.officeAddressLine1, c.officeCity, [c.officeState, c.officeZip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  let latitude = c.officeLatitude;
  let longitude = c.officeLongitude;
  if (latitude == null || longitude == null) {
    const geo = await geocodeAddress(`${label}, US`, companyId);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      await prisma.company.update({ where: { id: companyId }, data: { officeLatitude: latitude, officeLongitude: longitude } });
    }
  }
  return { label, latitude, longitude };
}

/** A customer property as a map point, geocoding and saving its coordinates the first time they're needed. */
export async function getPropertyPoint(companyId: string, property: {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
}): Promise<MapPoint> {
  const label = `${property.addressLine1}, ${property.city}, ${property.state} ${property.zip}`.trim();
  let { latitude, longitude } = property;
  if (latitude == null || longitude == null) {
    const geo = await geocodeAddress(`${label}, US`, companyId);
    if (geo) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      await prisma.property.update({ where: { id: property.id }, data: { latitude, longitude } });
    }
  }
  return { label, latitude, longitude };
}

// Google's encoded polyline format (precision 1e5).
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of ["lat", "lng"] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index <= encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Drive routes rarely change, so repeat views of the same estimate don't re-bill the Routes API.
const routeCache = new Map<string, { at: number; route: DriveRoute | null }>();
const ROUTE_CACHE_MS = 24 * 60 * 60 * 1000;

/** Driving distance, time and line between two points via the Google Routes API (null if unavailable). */
export async function getDriveRoute(companyId: string, office: MapPoint | null, destination: MapPoint | null): Promise<DriveRoute | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !office || !destination) return null;
  if (office.latitude == null || office.longitude == null || destination.latitude == null || destination.longitude == null) return null;

  const key = `${office.latitude},${office.longitude}>${destination.latitude},${destination.longitude}`;
  const hit = routeCache.get(key);
  if (hit && Date.now() - hit.at < ROUTE_CACHE_MS) return hit.route;
  if ((await getUsageStatus(companyId)).capped) return null;

  let route: DriveRoute | null = null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: office.latitude, longitude: office.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        travelMode: "DRIVE",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      await recordUsage(companyId, "ROUTE", GOOGLE_COST_MICROS.ROUTE);
      const r = (await res.json())?.routes?.[0];
      if (r?.distanceMeters != null && r.duration) {
        route = {
          distanceMiles: r.distanceMeters / 1609.344,
          durationMinutes: Math.max(1, Math.round(parseInt(String(r.duration), 10) / 60)),
          path: r.polyline?.encodedPolyline ? decodePolyline(r.polyline.encodedPolyline) : [],
        };
      }
    } else {
      console.error("Routes API failed", res.status, (await res.text()).slice(0, 300));
    }
  } catch (err) {
    console.error("Routes API request failed", err);
  }
  if (route) routeCache.set(key, { at: Date.now(), route });
  return route;
}

export function buildRoute(office: MapPoint | null, destination: MapPoint | null, drive: DriveRoute | null = null, paused = false): RouteInfo {
  const straightMiles =
    office && destination && office.latitude != null && office.longitude != null && destination.latitude != null && destination.longitude != null
      ? haversineDistanceMiles(
          { latitude: office.latitude, longitude: office.longitude },
          { latitude: destination.latitude, longitude: destination.longitude },
        )
      : null;
  return { office, destination, straightMiles, drive, paused };
}
