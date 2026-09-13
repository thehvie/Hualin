import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type Job = Awaited<ReturnType<typeof loadJobs>>[number];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEWS = ["month", "week", "day"] as const;
type View = (typeof VIEWS)[number];

// Timeline range for Day/Week views. Fixed for now (matches the business
// hours the booking widget uses, plus a little buffer on each side).
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 20;
const ROW_HEIGHT = 56;

const STATUS_DOT: Record<string, string> = {
  UNSCHEDULED: "bg-zinc-300",
  SCHEDULED: "bg-brand",
  IN_PROGRESS: "bg-amber-400",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

const STATUS_BLOCK: Record<string, string> = {
  UNSCHEDULED: "bg-zinc-100 text-zinc-600 border-zinc-200",
  SCHEDULED: "bg-brand/10 text-brand-dark border-brand/30",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 line-through",
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - lastOfMonth.getDay()));
  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) days.push(new Date(d));
  return days;
}

async function loadJobs(companyId: string, rangeStart: Date, rangeEndExclusive: Date) {
  return prisma.job.findMany({
    where: { companyId, scheduledAt: { gte: rangeStart, lt: rangeEndExclusive } },
    include: { customer: true },
    orderBy: { scheduledAt: "asc" },
  });
}

function groupByDay(jobs: Job[]) {
  const map = new Map<string, Job[]>();
  for (const job of jobs) {
    if (!job.scheduledAt) continue;
    const key = job.scheduledAt.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(job);
  }
  return map;
}

function timelineHours() {
  const hours: number[] = [];
  for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) hours.push(h);
  return hours;
}
function formatHourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

function DayColumn({ day, jobs, showLabels }: { day: Date; jobs: Job[]; showLabels?: boolean }) {
  const hours = timelineHours();
  const totalHeight = (hours.length - 1) * ROW_HEIGHT;
  return (
    <div className="flex">
      {showLabels && (
        <div className="w-14 shrink-0" style={{ marginTop: -8 }}>
          {hours.map((h) => (
            <div key={h} style={{ height: ROW_HEIGHT }} className="pr-2 text-right text-xs text-zinc-400">
              {formatHourLabel(h)}
            </div>
          ))}
        </div>
      )}
      <div className="relative flex-1 border-l border-zinc-100" style={{ height: totalHeight }}>
        {hours.slice(0, -1).map((h, i) => (
          <div key={h} className="absolute inset-x-0 border-t border-zinc-100" style={{ top: i * ROW_HEIGHT }} />
        ))}
        {jobs.map((job) => {
          if (!job.scheduledAt) return null;
          const hour = job.scheduledAt.getHours() + job.scheduledAt.getMinutes() / 60;
          if (hour < TIMELINE_START_HOUR || hour >= TIMELINE_END_HOUR) return null;
          const top = (hour - TIMELINE_START_HOUR) * ROW_HEIGHT;
          return (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              style={{ top: top + 2, height: ROW_HEIGHT - 4 }}
              className={`absolute inset-x-1 overflow-hidden rounded-lg border px-2 py-1 text-xs ${STATUS_BLOCK[job.status]}`}
            >
              <p className="truncate font-semibold">{job.customer.firstName} {job.customer.lastName}</p>
              <p className="truncate text-[11px] opacity-80">
                {job.scheduledAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { companyId } = await requireSession();
  const { view: viewParam, date: dateParam } = await searchParams;

  const view: View = VIEWS.includes(viewParam as View) ? (viewParam as View) : "month";
  const today = startOfDay(new Date());
  const anchor = dateParam ? startOfDay(new Date(dateParam + "T00:00:00")) : today;

  let rangeStart: Date;
  let rangeEndExclusive: Date;
  let headerLabel: string;
  let prevHref: string;
  let nextHref: string;

  if (view === "month") {
    const year = anchor.getFullYear();
    const monthIndex = anchor.getMonth();
    const days = monthGrid(year, monthIndex);
    rangeStart = days[0];
    rangeEndExclusive = addDays(days[days.length - 1], 1);
    headerLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    prevHref = `/schedule?view=month&date=${fmtDate(addDays(new Date(year, monthIndex, 1), -1))}`;
    nextHref = `/schedule?view=month&date=${fmtDate(new Date(year, monthIndex + 1, 1))}`;
  } else if (view === "week") {
    const weekStart = addDays(anchor, -anchor.getDay());
    rangeStart = weekStart;
    rangeEndExclusive = addDays(weekStart, 7);
    const weekEnd = addDays(weekStart, 6);
    headerLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    prevHref = `/schedule?view=week&date=${fmtDate(addDays(anchor, -7))}`;
    nextHref = `/schedule?view=week&date=${fmtDate(addDays(anchor, 7))}`;
  } else {
    rangeStart = anchor;
    rangeEndExclusive = addDays(anchor, 1);
    headerLabel = anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    prevHref = `/schedule?view=day&date=${fmtDate(addDays(anchor, -1))}`;
    nextHref = `/schedule?view=day&date=${fmtDate(addDays(anchor, 1))}`;
  }

  const jobs = await loadJobs(companyId, rangeStart, rangeEndExclusive);
  const jobsByDay = groupByDay(jobs);
  const todayHref = `/schedule?view=${view}&date=${fmtDate(today)}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">Schedule</h1>
        <div className="flex items-center gap-2">
          <Link href={todayHref} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            Today
          </Link>
          <Link href={prevHref} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ‹
          </Link>
          <span className="min-w-[160px] text-center text-sm font-semibold text-zinc-900">{headerLabel}</span>
          <Link href={nextHref} className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50">
            ›
          </Link>
          <div className="ml-2 flex overflow-hidden rounded-lg border border-zinc-300">
            {VIEWS.map((v) => (
              <Link
                key={v}
                href={`/schedule?view=${v}&date=${fmtDate(anchor)}`}
                className={`px-3 py-2 text-sm font-semibold capitalize ${
                  v === view ? "bg-brand text-white" : "bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {view === "month" && (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="px-3 py-2 text-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid(anchor.getFullYear(), anchor.getMonth()).map((day) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const isToday = day.toDateString() === today.toDateString();
              const dayJobs = jobsByDay.get(day.toDateString()) || [];
              return (
                <div key={day.toISOString()} className={`min-h-[110px] border-b border-r border-zinc-100 p-2 ${inMonth ? "bg-white" : "bg-zinc-50"}`}>
                  <Link
                    href={`/schedule?view=day&date=${fmtDate(day)}`}
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium hover:ring-2 hover:ring-brand/30 ${
                      isToday ? "bg-brand text-white" : inMonth ? "text-zinc-700" : "text-zinc-300"
                    }`}
                  >
                    {day.getDate()}
                  </Link>
                  <ul className="mt-1 flex flex-col gap-1">
                    {dayJobs.slice(0, 3).map((job) => (
                      <li key={job.id}>
                        <Link href={`/jobs/${job.id}`} className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[job.status]}`} />
                          <span className="shrink-0 font-medium">{job.scheduledAt?.toLocaleTimeString("en-US", { hour: "numeric" })}</span>
                          <span className="truncate">{job.customer.firstName} {job.customer.lastName}</span>
                        </Link>
                      </li>
                    ))}
                    {dayJobs.length > 3 && <li className="px-1 text-xs text-zinc-400">+{dayJobs.length - 3} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex min-w-[800px]">
            <div className="w-14 shrink-0" />
            <div className="grid flex-1 grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)).map((day) => {
                const isToday = day.toDateString() === today.toDateString();
                return (
                  <Link key={day.toISOString()} href={`/schedule?view=day&date=${fmtDate(day)}`} className="pb-2 text-center hover:opacity-70">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-brand text-white" : "text-zinc-900"}`}>
                      {day.getDate()}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex min-w-[800px]">
            <div className="w-14 shrink-0" style={{ marginTop: -8 }}>
              {timelineHours().map((h) => (
                <div key={h} style={{ height: ROW_HEIGHT }} className="pr-2 text-right text-xs text-zinc-400">
                  {formatHourLabel(h)}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i)).map((day) => (
                <DayColumn key={day.toISOString()} day={day} jobs={jobsByDay.get(day.toDateString()) || []} />
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "day" && (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4">
          <div className="min-w-[500px]">
            <DayColumn day={anchor} jobs={jobsByDay.get(anchor.toDateString()) || []} showLabels />
          </div>
        </div>
      )}
    </div>
  );
}
