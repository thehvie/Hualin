import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOT: Record<string, string> = {
  UNSCHEDULED: "bg-zinc-300",
  SCHEDULED: "bg-brand",
  IN_PROGRESS: "bg-amber-400",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-red-400",
};

function monthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const lastOfMonth = new Date(year, month + 1, 0);
  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(gridEnd.getDate() + (6 - lastOfMonth.getDay()));

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { companyId } = await requireSession();
  const { month: monthParam } = await searchParams;

  const today = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map((n) => parseInt(n, 10))
    : [today.getFullYear(), today.getMonth() + 1];
  const monthIndex = month - 1;

  const days = monthGrid(year, monthIndex);
  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const rangeEndExclusive = new Date(rangeEnd);
  rangeEndExclusive.setDate(rangeEndExclusive.getDate() + 1);

  const jobs = await prisma.job.findMany({
    where: { companyId, scheduledAt: { gte: rangeStart, lt: rangeEndExclusive } },
    include: { customer: true },
    orderBy: { scheduledAt: "asc" },
  });

  const jobsByDay = new Map<string, typeof jobs>();
  for (const job of jobs) {
    if (!job.scheduledAt) continue;
    const key = job.scheduledAt.toDateString();
    if (!jobsByDay.has(key)) jobsByDay.set(key, []);
    jobsByDay.get(key)!.push(job);
  }

  function monthParamFor(y: number, m: number) {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  const prevMonth = monthIndex === 0 ? { y: year - 1, m: 11 } : { y: year, m: monthIndex - 1 };
  const nextMonth = monthIndex === 11 ? { y: year + 1, m: 0 } : { y: year, m: monthIndex + 1 };
  const monthLabel = new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">Schedule</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/schedule?month=${monthParamFor(today.getFullYear(), today.getMonth())}`}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Today
          </Link>
          <Link
            href={`/schedule?month=${monthParamFor(prevMonth.y, prevMonth.m)}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50"
          >
            ‹
          </Link>
          <span className="min-w-[140px] text-center text-sm font-semibold text-zinc-900">{monthLabel}</span>
          <Link
            href={`/schedule?month=${monthParamFor(nextMonth.y, nextMonth.m)}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 hover:bg-zinc-50"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="px-3 py-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = day.getMonth() === monthIndex;
            const isToday = day.toDateString() === today.toDateString();
            const dayJobs = jobsByDay.get(day.toDateString()) || [];
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[110px] border-b border-r border-zinc-100 p-2 ${inMonth ? "bg-white" : "bg-zinc-50"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday ? "bg-brand text-white" : inMonth ? "text-zinc-700" : "text-zinc-300"
                  }`}
                >
                  {day.getDate()}
                </span>
                <ul className="mt-1 flex flex-col gap-1">
                  {dayJobs.slice(0, 3).map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[job.status]}`} />
                        <span className="shrink-0 font-medium">
                          {job.scheduledAt?.toLocaleTimeString("en-US", { hour: "numeric" })}
                        </span>
                        <span className="truncate">{job.customer.firstName} {job.customer.lastName}</span>
                      </Link>
                    </li>
                  ))}
                  {dayJobs.length > 3 && (
                    <li className="px-1 text-xs text-zinc-400">+{dayJobs.length - 3} more</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
