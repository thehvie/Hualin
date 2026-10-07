"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, reportMapLoad } from "@/components/google-map";
import type { RouteInfo } from "@/lib/office";

/** Map of the customer's address with the driving route from the office, plus distance and drive time. */
export function RouteMap({ route }: { route: RouteInfo }) {
  const { office, destination, straightMiles, drive, paused } = route;
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");

  const dLat = destination?.latitude ?? null;
  const dLng = destination?.longitude ?? null;
  const oLat = office?.latitude ?? null;
  const oLng = office?.longitude ?? null;
  const pathKey = drive ? `${drive.path.length}:${drive.distanceMiles}` : "";

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    if (dLat == null || dLng == null || paused) return;

    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const maps = window.google!.maps;
        const dest = { lat: dLat, lng: dLng };
        const map = new maps.Map(mapRef.current, { center: dest, zoom: 13, disableDefaultUI: true, zoomControl: true });
        new maps.Marker({ position: dest, map, title: destination?.label });

        const bounds = new maps.LatLngBounds();
        bounds.extend(dest);
        if (oLat != null && oLng != null) {
          const origin = { lat: oLat, lng: oLng };
          new maps.Marker({ position: origin, map, title: "Office" });
          bounds.extend(origin);
        }
        if (drive && drive.path.length > 1) {
          const path = drive.path.map(([lat, lng]) => ({ lat, lng }));
          new maps.Polyline({ path, map, strokeColor: "#f97316", strokeWeight: 5, strokeOpacity: 0.9 });
          path.forEach((pt) => bounds.extend(pt));
        }
        if (oLat != null) {
          map.fitBounds(bounds, 40);
          // The office and the customer can be the same spot (or very close); fitting to a single point zooms
          // in so far that the map shows blank grey tiles, so never zoom in past street level.
          maps.event.addListenerOnce(map, "idle", () => {
            if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
          });
        }
        reportMapLoad();
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dLat, dLng, oLat, oLng, pathKey, paused, destination?.label]);

  if (!destination) return null;

  const link = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination.label)}&travelmode=driving${
    office ? `&origin=${encodeURIComponent(office.label)}` : ""
  }`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Location</h2>
        <a href={link} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand hover:underline">
          Open in Google Maps ↗
        </a>
      </div>

      {dLat != null && dLng != null && !paused && status !== "no-key" && status !== "error" ? (
        <div ref={mapRef} style={{ height: 240 }} className="w-full rounded-lg bg-zinc-100" />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg bg-zinc-100 px-4 text-center text-xs text-zinc-400">
          {paused
            ? "Maps are paused: this month's usage limit was reached. See Settings."
            : status === "no-key"
            ? "Map unavailable until a Google Maps API key is set."
            : status === "error"
              ? "Couldn't load the map."
              : "No map location for this address yet."}
        </div>
      )}

      <div className="text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">{destination.label}</p>
        {drive ? (
          <p className="mt-1">
            {drive.distanceMiles.toFixed(1)} mi · about {drive.durationMinutes} min drive from the office
          </p>
        ) : straightMiles != null ? (
          <p className="mt-1 text-zinc-500">~{straightMiles.toFixed(1)} mi from the office (straight line)</p>
        ) : !office ? (
          <p className="mt-1 text-xs text-zinc-400">Add your office address in Settings to see the distance.</p>
        ) : null}
      </div>
    </div>
  );
}
