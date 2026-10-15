"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMapsScript, reportMapLoad } from "@/components/google-map";
import type { DispatchTask } from "@/lib/dispatch-tasks";

export interface MapDriver {
  id: string;
  name: string;
  color: string;
}

const UNASSIGNED = "#52525b";

/** The day's stops as pins: each in its driver's colour (dark grey while unassigned), D for drop-off and P for pickup. */
export function AssignMap({
  tasks,
  assignments,
  drivers,
  office,
  selectedId,
  onSelect,
  usageRef,
}: {
  tasks: DispatchTask[];
  assignments: Record<string, string | null>;
  drivers: MapDriver[];
  office: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  usageRef: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const onSelectRef = useRef(onSelect);
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const placed = tasks.filter((t) => t.lat != null && t.lng != null);
  const placedSignature = placed.map((t) => `${t.id}:${t.lat}:${t.lng}`).join("|");

  // Build the map and its pins whenever the set of places changes (a new day).
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("no-key");
      return;
    }
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !boxRef.current) return;
        const maps = window.google!.maps;
        const map = new maps.Map(boxRef.current, { center: office ?? { lat: 28.54, lng: -81.38 }, zoom: 10, disableDefaultUI: true, zoomControl: true });
        mapRef.current = map;
        infoRef.current = new maps.InfoWindow();
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = new Map();
        const bounds = new maps.LatLngBounds();

        if (office) {
          new maps.Marker({ position: office, map, title: "Office", icon: { path: maps.SymbolPath.BACKWARD_CLOSED_ARROW, scale: 5, fillColor: "#18181b", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 1.5 } });
          bounds.extend(office);
        }
        for (const t of placed) {
          const marker = new maps.Marker({ position: { lat: t.lat!, lng: t.lng! }, map, title: `${t.customer}, ${t.unit}` });
          marker.addListener("click", () => onSelectRef.current(t.id));
          markersRef.current.set(t.id, marker);
          bounds.extend({ lat: t.lat!, lng: t.lng! });
        }
        if (placed.length > 0 || office) {
          map.fitBounds(bounds, 60);
          maps.event.addListenerOnce(map, "idle", () => {
            if ((map.getZoom() ?? 0) > 13) map.setZoom(13);
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
  }, [placedSignature, office?.lat, office?.lng, usageRef]);

  // Restyle pins as drivers are assigned, without rebuilding the map.
  useEffect(() => {
    if (status !== "ready" || !window.google) return;
    const maps = window.google.maps;
    const colorOf = new Map(drivers.map((d) => [d.id, d.color]));
    for (const t of placed) {
      const marker = markersRef.current.get(t.id);
      if (!marker) continue;
      const driverId = assignments[t.id] ?? null;
      const selected = t.id === selectedId;
      marker.setIcon({ path: maps.SymbolPath.CIRCLE, scale: selected ? 15 : 12, fillColor: driverId ? (colorOf.get(driverId) ?? UNASSIGNED) : UNASSIGNED, fillOpacity: 1, strokeColor: selected ? "#facc15" : "#fff", strokeWeight: selected ? 4 : 2 });
      marker.setLabel({ text: t.kind === "DELIVERY" ? "D" : "P", color: "#fff", fontSize: "11px", fontWeight: "700" });
      marker.setZIndex(selected ? 1000 : undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, assignments, selectedId, drivers, placedSignature]);

  // Bring the chosen stop into view with its details.
  useEffect(() => {
    if (status !== "ready" || !selectedId || !mapRef.current || !infoRef.current) return;
    const marker = markersRef.current.get(selectedId);
    const t = tasks.find((x) => x.id === selectedId);
    if (!marker || !t) return;
    const box = document.createElement("div");
    box.style.cssText = "font:13px system-ui,sans-serif;max-width:240px;line-height:1.4";
    const add = (text: string, css: string) => {
      const el = document.createElement("div");
      el.textContent = text;
      el.style.cssText = css;
      box.appendChild(el);
    };
    add(t.customer, "font-weight:600");
    add(`${t.kind === "DELIVERY" ? "Drop off" : t.swap ? "Swap pickup" : "Pick up"} ${t.unit}`, "color:#52525b");
    add(t.when, "color:#ea580c;font-weight:600;margin-top:2px");
    if (t.address) add(t.address, "color:#71717a;margin-top:2px");
    infoRef.current.setContent(box);
    infoRef.current.open({ map: mapRef.current, anchor: marker });
    mapRef.current.panTo(marker.getPosition()!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, status]);

  if (status === "no-key" || status === "error") {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl bg-zinc-100 px-4 text-center text-sm text-zinc-400">
        {status === "no-key" ? "The map needs a Google Maps API key. You can still assign stops from the lists." : "Couldn't load the map. You can still assign stops from the lists."}
      </div>
    );
  }
  return <div ref={boxRef} className="h-full min-h-[360px] w-full rounded-xl border border-zinc-200 bg-zinc-100" />;
}
