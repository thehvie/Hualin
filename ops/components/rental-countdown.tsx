"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/money";
import { rentalClock, runningExtraCents, type ClockInput } from "@/lib/rental-clock";
import type { PackageTerms } from "@/lib/rental-charges";

export interface CountdownData {
  status: ClockInput["status"];
  startAt: string;
  endAt: string;
  deliveredAt: string | null;
  tz: string;
  terms: PackageTerms | null;
}

const TONE = {
  idle: "bg-zinc-100 text-zinc-700",
  ok: "bg-sky-100 text-sky-800",
  soon: "bg-amber-100 text-amber-800",
  late: "bg-red-100 text-red-700",
} as const;
const BAR = { idle: "bg-zinc-400", ok: "bg-sky-500", soon: "bg-amber-500", late: "bg-red-500" } as const;

/** Live rental counter: time to delivery, time left on site (with a progress bar), or how overdue it is. Ticks each minute. */
export function RentalCountdown({ data, bar = true }: { data: CountdownData; bar?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null; // rendered after mount so the server and browser never disagree about the time

  const input: ClockInput = {
    status: data.status,
    startAt: new Date(data.startAt),
    endAt: new Date(data.endAt),
    deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : null,
  };
  const clock = rentalClock(input, now);
  if (!clock) return null;
  const extra = clock.overdue ? runningExtraCents(input, data.terms, data.tz, now) : 0;

  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${TONE[clock.tone]}`}>⏱ {clock.label}</span>
        {extra > 0 && <span className="text-xs font-semibold text-red-700">{formatCents(extra)} extra so far</span>}
      </span>
      {bar && clock.progress != null && (
        <span className="block h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100">
          <span className={`block h-full rounded-full ${BAR[clock.tone]}`} style={{ width: `${Math.round(clock.progress * 100)}%` }} />
        </span>
      )}
    </span>
  );
}
