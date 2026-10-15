import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { companyHasFeature } from "@/lib/plan-access";
import { FeatureLocked } from "@/components/feature-locked";
import { getOfficePoint } from "@/lib/office";
import { dispatchTasks } from "@/lib/dispatch-tasks";
import { getUsageStatus, USAGE_PAUSED_MESSAGE } from "@/lib/usage";
import { addDaysYmd, formatInTz, startOfDayInTz, wallYmd } from "@/lib/tz";
import { AssignBoard } from "./assign-board";

export const metadata = { title: "Dispatch map" };

export default async function AssignPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { companyId, role } = await requireSession();
  if (!(await companyHasFeature(companyId, "RENTALS"))) return <FeatureLocked feature="RENTALS" title="Dispatch" />;

  const { date: dateParam } = await searchParams;
  const [company, office] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, select: { timezone: true } }),
    getOfficePoint(companyId),
  ]);
  const tz = company.timezone;
  const todayYmd = wallYmd(new Date(), tz);
  const ymd = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayYmd;
  const tomorrowYmd = addDaysYmd(todayYmd, 1);

  const paused = (await getUsageStatus(companyId)).capped;
  const [tasks, drivers] = await Promise.all([
    dispatchTasks(companyId, tz, ymd),
    prisma.driver.findMany({ where: { companyId, active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true, vehicle: true } }),
  ]);

  const officeSpot = office && office.latitude != null && office.longitude != null ? { lat: office.latitude, lng: office.longitude } : null;
  const dayLabel = formatInTz(startOfDayInTz(ymd, tz), tz, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const chip = (active: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-brand text-white" : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"}`;

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            <Link href="/dispatch" className="hover:text-zinc-600">
              Dispatch
            </Link>{" "}
            / Map
          </p>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">Assign drivers</h1>
          <p className="mt-1 text-sm text-zinc-500">{dayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/dispatch/assign?date=${addDaysYmd(ymd, -1)}`} aria-label="Previous day" className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ‹
          </Link>
          <Link href={`/dispatch/assign?date=${addDaysYmd(ymd, 1)}`} aria-label="Next day" className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ›
          </Link>
          <Link href="/dispatch/assign" className={chip(ymd === todayYmd)}>
            Today
          </Link>
          <Link href={`/dispatch/assign?date=${tomorrowYmd}`} className={chip(ymd === tomorrowYmd)}>
            Tomorrow
          </Link>
          <Link href="/dispatch" className="ml-2 text-sm font-medium text-zinc-500 hover:text-zinc-800">
            Back to the list
          </Link>
        </div>
      </div>

      {paused && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{USAGE_PAUSED_MESSAGE} Stops with no saved location can&apos;t be pinned until then.</p>}

      <AssignBoard
        key={ymd}
        tasks={tasks}
        drivers={drivers.map((d) => ({ id: d.id, name: d.name, color: d.color, vehicle: d.vehicle }))}
        office={officeSpot}
        usageRef={`assign:${ymd}`}
        canEdit={role === "ADMIN" || role === "DISPATCHER"}
      />
    </div>
  );
}
