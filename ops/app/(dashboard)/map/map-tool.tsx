"use client";

import { useState, useTransition } from "react";
import { RouteMap } from "@/components/route-map";
import { clearRecent, lookupAddress, lookupRecent, type LookupResult } from "./actions";

export interface RecentAddress {
  id: string;
  label: string;
}

/** Address search box with the map, route, distance and fuel charge underneath, and the last 10 addresses. */
export function MapTool({ officeLabel, recent }: { officeLabel: string | null; recent: RecentAddress[] }) {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    const query = address.trim();
    if (!query) return;
    startTransition(async () => setResult(await lookupAddress(query)));
  }

  function reopen(item: RecentAddress) {
    setAddress(item.label);
    startTransition(async () => setResult(await lookupRecent(item.id)));
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

      {recent.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent addresses</h2>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Clear your recent addresses?")) startTransition(async () => void (await clearRecent()));
              }}
              className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-zinc-100">
            {recent.map((r) => (
              <li key={r.id}>
                <button type="button" disabled={pending} onClick={() => reopen(r)} className="flex w-full items-center gap-2 py-2 text-left text-sm text-zinc-700 hover:text-brand disabled:opacity-60">
                  <span className="text-zinc-300">📍</span>
                  <span className="truncate">{r.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
