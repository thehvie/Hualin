"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsScript, reportMapLoad } from "@/components/google-map";
import type { Pin } from "@/lib/map-pins";
import { PIN_STYLE } from "@/lib/map-pin-style";

/** Several places on one map: colored pins you can click for details, plus your office. */
export function PinsMap({
  pins,
  office,
  usageRef,
  height = 420,
}: {
  pins: Pin[];
  office: { lat: number; lng: number } | null;
  usageRef: string;
  height?: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const signature = pins.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus("no-key");
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const maps = window.google!.maps;
        const map = new maps.Map(mapRef.current, { center: office ?? { lat: 28.54, lng: -81.38 }, zoom: 10, disableDefaultUI: true, zoomControl: true });
        const bounds = new maps.LatLngBounds();
        const info = new maps.InfoWindow();

        if (office) {
          new maps.Marker({
            position: office,
            map,
            title: "Office",
            icon: { path: maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 5, fillColor: "#18181b", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 },
          });
          bounds.extend(office);
        }

        for (const pin of pins) {
          const marker = new maps.Marker({
            position: { lat: pin.lat, lng: pin.lng },
            map,
            title: pin.title,
            icon: { path: maps.SymbolPath.CIRCLE, scale: 10, fillColor: PIN_STYLE[pin.kind].color, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
          });
          marker.addListener("click", () => {
            // Built from text nodes, never HTML strings, so customer-entered text can't inject markup.
            const box = document.createElement("div");
            box.style.cssText = "font:13px system-ui,sans-serif;max-width:240px;line-height:1.4";
            const add = (text: string, css: string) => {
              const el = document.createElement("div");
              el.textContent = text;
              el.style.cssText = css;
              box.appendChild(el);
            };
            add(pin.title, "font-weight:600");
            add(pin.subtitle, "color:#52525b");
            add(pin.when, `color:${PIN_STYLE[pin.kind].color};font-weight:600;margin-top:2px`);
            add(pin.address, "color:#71717a;margin-top:2px");
            const link = document.createElement("a");
            link.href = pin.href;
            link.textContent = "Open";
            link.style.cssText = "color:#ea580c;font-weight:600;display:inline-block;margin-top:4px";
            box.appendChild(link);
            info.setContent(box);
            info.open({ map, anchor: marker });
          });
          bounds.extend({ lat: pin.lat, lng: pin.lng });
        }

        if (pins.length > 0 || office) {
          map.fitBounds(bounds, 50);
          // A single pin would zoom in to rooftop level; keep some surroundings in view.
          maps.event.addListenerOnce(map, "idle", () => {
            if ((map.getZoom() ?? 0) > 14) map.setZoom(14);
          });
        }
        reportMapLoad(usageRef.slice(0, 80));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, office?.lat, office?.lng, usageRef]);

  if (status === "no-key" || status === "error") {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-zinc-100 px-4 text-center text-sm text-zinc-400">
        {status === "no-key" ? "The map needs a Google Maps API key." : "Couldn't load the map."}
      </div>
    );
  }
  return <div ref={mapRef} style={{ height }} className="w-full rounded-xl border border-zinc-200 bg-zinc-100" />;
}
