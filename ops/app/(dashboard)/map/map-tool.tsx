"use client";

import { useState, useTransition } from "react";
import { RouteMap } from "@/components/route-map";
import { lookupAddress, type LookupResult } from "./actions";

/** Address search box with the map, route, distance and fuel charge underneath. */
export function MapTool({ officeLabel }: { officeLabel: string | null }) {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  function search(value = address) {
    const query = value.trim();
    if (!query) return;
    startTransition(async () => {
      const res = await lookupAddress(query);
      setResult(res);
      if (res.ok) setRecent((prev) => [res.route.destination?.label ?? query, ...prev.filter((r) => r !== (res.route.destination?.label ?? query))].slice(0, 6));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row"
      >
        <input
          autoFocus
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Orlando, FL"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button type="submit" disabled={pending || address.trim().length < 4} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Looking…" : "Show on map"}
        </button>
      </form>
      {officeLabel && <p className="-mt-2 text-xs text-zinc-400">Distances are from {officeLabel}.</p>}

      {result && !result.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>}

      {result?.ok && (
        <RouteMap
          // Remount for each search so the map redraws for the new place.
          key={`${result.route.destination?.latitude}-${result.route.destination?.longitude}`}
          route={result.route}
          fuel={result.fuel}
        />
      )}

      {recent.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Recent:</span>
          {recent.slice(1).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setAddress(r);
                search(r);
              }}
              className="max-w-xs truncate rounded-full border border-zinc-300 px-2.5 py-1 hover:bg-zinc-50"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
