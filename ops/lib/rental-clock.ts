import { rentalCharges, type PackageTerms } from "@/lib/rental-charges";

export interface ClockInput {
  status: "RESERVED" | "DELIVERED" | "PICKUP_REQUESTED" | "PICKED_UP" | "CANCELLED";
  startAt: Date;
  endAt: Date;
  deliveredAt: Date | null;
  /** Dates only (no dumpster reserved): "Starts in", time left, then "Ended" instead of delivery wording. */
  schedule?: boolean;
}

export interface Clock {
  /** "Delivers in 1d 3h", "2d 4h left", "Overdue 5h". */
  label: string;
  tone: "idle" | "ok" | "soon" | "late";
  /** 0..1 of the rental period used (on site only), else null. */
  progress: number | null;
  overdue: boolean;
}

/** "1d 3h", "3h 20m", "45m": the two largest units of a span, never negative. */
export function spanText(ms: number): string {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${Math.max(1, m)}m`;
}

/**
 * The rental countdown. Before delivery it counts to the scheduled drop-off; once the dumpster is out it counts down
 * to the planned pickup, starting from the real delivery time, and after that it shows how long it is overdue.
 */
export function rentalClock(r: ClockInput, now: Date): Clock | null {
  const t = now.getTime();
  if (r.status === "PICKED_UP" || r.status === "CANCELLED") return null;

  if (r.schedule) {
    const toStart = r.startAt.getTime() - t;
    if (toStart > 0) return { label: `Starts in ${spanText(toStart)}`, tone: toStart < 3_600_000 * 3 ? "soon" : "idle", progress: null, overdue: false };
    const end = r.endAt.getTime();
    if (t >= end) return { label: `Ended ${spanText(t - end)} ago`, tone: "idle", progress: 1, overdue: false };
    const total = Math.max(1, end - r.startAt.getTime());
    return { label: `${spanText(end - t)} left`, tone: end - t < 24 * 3_600_000 ? "soon" : "ok", progress: (t - r.startAt.getTime()) / total, overdue: false };
  }

  if (r.status === "RESERVED") {
    const diff = r.startAt.getTime() - t;
    return diff >= 0
      ? { label: `Delivers in ${spanText(diff)}`, tone: diff < 3_600_000 * 3 ? "soon" : "idle", progress: null, overdue: false }
      : { label: `Delivery ${spanText(-diff)} late`, tone: "late", progress: null, overdue: true };
  }

  const from = (r.deliveredAt ?? r.startAt).getTime();
  const end = r.endAt.getTime();
  const diff = end - t;
  if (diff < 0) return { label: `Overdue ${spanText(-diff)}`, tone: "late", progress: 1, overdue: true };
  const total = Math.max(1, end - from);
  return {
    label: `${spanText(diff)} left`,
    tone: diff < 24 * 3_600_000 ? "soon" : "ok",
    progress: Math.min(1, Math.max(0, (t - from) / total)),
    overdue: false,
  };
}

/** What the days kept past the package already add up to if the dumpster came back right now. */
export function runningExtraCents(
  r: ClockInput,
  terms: PackageTerms | null,
  tz: string,
  now: Date,
): number {
  if (!terms || !r.deliveredAt || (r.status !== "DELIVERED" && r.status !== "PICKUP_REQUESTED")) return 0;
  const c = rentalCharges({ deliveredAt: r.deliveredAt, pickedUpAt: now, weightTons: null }, terms, tz);
  return c?.totalCents ?? 0;
}
