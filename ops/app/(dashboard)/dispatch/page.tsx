import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { companyHasFeature } from "@/lib/plan-access";
import { FeatureLocked } from "@/components/feature-locked";
import { addDaysYmd, startOfDayInTz, wallYmd } from "@/lib/tz";
import { openBookings, toStops } from "@/lib/rental-stops";
import { RentalRow } from "@/components/rental-row";
import { RentalAiPanel } from "@/components/rental-ai-panel";
import { loadRentalAiQueue } from "@/lib/rental-ai-queue";

const RANGES = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "Next 7 days", days: 7 },
  { key: "all", label: "Everything open", days: null },
] as const;

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { companyId } = await requireSession();
  if (!(await companyHasFeature(companyId, "RENTALS"))) return <FeatureLocked feature="RENTALS" title="Dispatch" />;
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1];

  const { timezone } = await prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } });
  const todayYmd = wallYmd(new Date(), timezone);
  const cutoff = range.days === null ? null : startOfDayInTz(addDaysYmd(todayYmd, range.days), timezone).getTime();

  const bookings = await openBookings(companyId);
  const stops = toStops(bookings, timezone);
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const withinRange = (ms: number) => cutoff === null || ms < cutoff;

  const deliveries = stops.filter((s) => s.status === "RESERVED" && withinRange(byId.get(s.id)!.startAt.getTime()));
  // Customers asking for a pickup come first, then dumpsters whose rental period is up.
  const pickups = stops
    .filter((s) => s.status === "PICKUP_REQUESTED" || (s.status === "DELIVERED" && withinRange(byId.get(s.id)!.endAt.getTime())))
    .sort((a, b) => Number(b.status === "PICKUP_REQUESTED") - Number(a.status === "PICKUP_REQUESTED"));
  const shownIds = new Set([...deliveries, ...pickups].map((s) => s.id));
  const stillOut = stops.filter((s) => !shownIds.has(s.id) && s.status !== "RESERVED");

  const queue = await loadRentalAiQueue(companyId, timezone);

  const empty = deliveries.length === 0 && pickups.length === 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Dispatch</h1>
          <p className="mt-1 text-sm text-zinc-500">Dumpster drop-offs and pickups. Tap the next step as you go.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
        <Link href="/dispatch/assign" className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Map and assign drivers
        </Link>
        <div className="flex overflow-hidden rounded-lg border border-zinc-300 text-sm font-semibold">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/dispatch?range=${r.key}`}
              className={`px-3 py-2 ${r.key === range.key ? "bg-brand text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"}`}
            >
              {r.label}
            </Link>
          ))}
        </div>
        </div>
      </div>

      <RentalAiPanel drafts={queue.drafts} proposals={queue.proposals} />

      {empty && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-400">
          <span className="mb-1 block text-2xl">🚛</span>
          Nothing to deliver or pick up in this range.
        </div>
      )}

      {deliveries.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Deliveries ({deliveries.length})</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {deliveries.map((s) => (
              <RentalRow key={s.id} stop={s} />
            ))}
          </ul>
        </section>
      )}

      {pickups.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Pickups ({pickups.length})</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {pickups.map((s) => (
              <RentalRow key={s.id} stop={s} />
            ))}
          </ul>
        </section>
      )}

      {stillOut.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">Still out, not due yet ({stillOut.length})</h2>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {stillOut.map((s) => (
              <RentalRow key={s.id} stop={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
