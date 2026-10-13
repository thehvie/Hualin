import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getOfficePoint } from "@/lib/office";
import { addDaysYmd, formatInTz, startOfDayInTz, wallYmd } from "@/lib/tz";
import { dayPins, dumpsterPins, type PinResult } from "@/lib/map-pins";
import { PIN_STYLE } from "@/lib/map-pin-style";
import { getUsageStatus, USAGE_PAUSED_MESSAGE } from "@/lib/usage";
import { PinsMap } from "@/components/pins-map";
import { MapTool } from "./map-tool";

const TABS = [
  { key: "lookup", label: "Look up an address" },
  { key: "day", label: "Day map" },
  { key: "dumpsters", label: "Dumpsters on site" },
] as const;

export default async function MapPage({ searchParams }: { searchParams: Promise<{ tab?: string; date?: string }> }) {
  const { companyId } = await requireSession();
  const { tab: tabParam, date: dateParam } = await searchParams;
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "lookup";

  const [office, company] = await Promise.all([
    getOfficePoint(companyId),
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { name: true, timezone: true } }),
  ]);
  const tz = company.timezone;
  const todayYmd = wallYmd(new Date(), tz);
  const ymd = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayYmd;
  const recent = tab === "lookup" ? await prisma.mapLookup.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, label: true } }) : [];
  const paused = tab !== "lookup" ? (await getUsageStatus(companyId)).capped : false;

  let result: PinResult | null = null;
  if (tab === "day" && !paused) result = await dayPins(companyId, tz, ymd);
  if (tab === "dumpsters" && !paused) result = await dumpsterPins(companyId, tz);

  const officeSpot = office && office.latitude != null && office.longitude != null ? { lat: office.latitude, lng: office.longitude } : null;
  const dayLabel = formatInTz(startOfDayInTz(ymd, tz), tz, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const kindsShown = result ? [...new Set(result.pins.map((p) => p.kind))] : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Map</h1>
        <p className="mt-1 text-sm text-zinc-500">Look up an address, see the day&apos;s stops, or see where your dumpsters are.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 text-sm font-semibold">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "lookup" ? "/map" : `/map?tab=${t.key}`}
            className={`rounded-md px-4 py-2 ${tab === t.key ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "lookup" && (
        <>
          {!office && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Add your office address in Settings to get distances. Without it you can still look up where an address is.
            </p>
          )}
          <MapTool officeLabel={office?.label ?? null} recent={recent} />
        </>
      )}

      {tab === "day" && (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/map?tab=day&date=${addDaysYmd(ymd, -1)}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ‹
          </Link>
          <span className="min-w-[220px] text-center text-sm font-semibold text-zinc-900">{dayLabel}</span>
          <Link href={`/map?tab=day&date=${addDaysYmd(ymd, 1)}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ›
          </Link>
          <Link href={`/map?tab=day&date=${todayYmd}`} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            Today
          </Link>
        </div>
      )}

      {paused && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{USAGE_PAUSED_MESSAGE}</p>}

      {result && (
        <>
          {result.pins.length === 0 && result.unlocated.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-400">
              <span className="mb-1 block text-2xl">📍</span>
              {tab === "day" ? "Nothing scheduled for this day." : "No dumpsters are out on a job right now."}
            </div>
          ) : (
            <>
              <PinsMap pins={result.pins} office={officeSpot} usageRef={`${tab}:${tab === "day" ? ymd : "now"}`} />

              {kindsShown.length > 0 && (
                <div className="flex flex-wrap gap-4 text-xs text-zinc-600">
                  {kindsShown.map((k) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className="inline-block h-3 w-3 rounded-full border border-white shadow" style={{ background: PIN_STYLE[k].color }} />
                      {PIN_STYLE[k].label}
                    </span>
                  ))}
                  {officeSpot && <span className="flex items-center gap-1.5">▲ Office</span>}
                </div>
              )}

              <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {result.pins.map((p) => (
                  <li key={p.id}>
                    <Link href={p.href} className="flex flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-3 hover:bg-zinc-50">
                      <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: PIN_STYLE[p.kind].color }} />
                      <span className="font-medium text-zinc-900">{p.title}</span>
                      <span className="text-sm text-zinc-600">{p.subtitle}</span>
                      <span className="text-xs font-semibold" style={{ color: PIN_STYLE[p.kind].color }}>
                        {p.when}
                      </span>
                      <span className="w-full pl-7 text-xs text-zinc-400">{p.address}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {result.unlocated.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="mb-1 font-semibold">Couldn&apos;t place {result.unlocated.length} on the map (no address or it wasn&apos;t found)</p>
                  <ul className="flex flex-col gap-0.5 text-xs">
                    {result.unlocated.map((u, i) => (
                      <li key={i}>
                        <Link href={u.href} className="underline">
                          {u.title}
                        </Link>{" "}
                        · {u.subtitle}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
