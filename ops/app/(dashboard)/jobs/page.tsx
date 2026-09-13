import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const STATUS_LABELS: Record<string, string> = {
  UNSCHEDULED: "Unscheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  UNSCHEDULED: "bg-zinc-100 text-zinc-600",
  SCHEDULED: "bg-brand/10 text-brand-dark",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function JobsPage() {
  const { companyId } = await requireSession();

  const jobs = await prisma.job.findMany({
    where: { companyId },
    include: { customer: true, property: true },
    orderBy: { scheduledAt: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Jobs</h1>
        <Link href="/schedule" className="text-sm font-medium text-brand hover:underline">
          View calendar →
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white py-16 text-center">
          <span className="text-3xl">🔧</span>
          <p className="text-sm font-semibold text-zinc-900">No jobs yet</p>
          <p className="text-xs text-zinc-400">Jobs appear here from approved estimates or online bookings.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-zinc-900 hover:text-brand">
                      {job.scheduledAt
                        ? job.scheduledAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : "Unscheduled"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{job.customer.firstName} {job.customer.lastName}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {job.property ? `${job.property.addressLine1}, ${job.property.city}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[job.status]}`}>
                      {STATUS_LABELS[job.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
