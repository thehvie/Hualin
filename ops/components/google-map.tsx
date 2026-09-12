"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
    __googleMapsCallback?: () => void;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    window.__googleMapsCallback = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__googleMapsCallback`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export function GoogleMap({
  latitude,
  longitude,
  label,
  height = 220,
}: {
  latitude: number | null;
  longitude: number | null;
  label?: string;
  height?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-key" | "no-location">(
    "loading",
  );

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    if (latitude == null || longitude == null) {
      setStatus("no-location");
      return;
    }

    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const position = { lat: latitude, lng: longitude };
        const map = new window.google!.maps.Map(mapRef.current, {
          center: position,
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
        });
        new window.google!.maps.Marker({ position, map, title: label });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, label]);

  if (status === "no-key") {
    return (
      <MapPlaceholder>
        Map unavailable — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in .env
      </MapPlaceholder>
    );
  }
  if (status === "no-location") {
    return <MapPlaceholder>No location on file for this address yet</MapPlaceholder>;
  }
  if (status === "error") {
    return <MapPlaceholder>Couldn&apos;t load the map</MapPlaceholder>;
  }

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-lg bg-zinc-100"
    />
  );
}

function MapPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] w-full items-center justify-center rounded-lg bg-zinc-100 px-4 text-center text-xs text-zinc-400">
      {children}
    </div>
  );
}
