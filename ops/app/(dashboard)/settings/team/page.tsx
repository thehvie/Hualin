import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getPlanAccess, officeUserCount } from "@/lib/plan-access";
import { EXTRA_USER_CENTS, PLANS, formatPrice } from "@/lib/plans";
import { seatsToBill } from "@/lib/billing";
import { addTeamMember, removeTeamMember } from "./actions";

const ROLE_LABEL = { ADMIN: "Admin", DISPATCHER: "Dispatcher", CREW: "Driver" } as const;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string; added?: string; removed?: string }> }) {
  const { companyId, role, userId } = await requireSession();
  const sp = await searchParams;
  const [access, users, officeUsers] = await Promise.all([
    getPlanAccess(companyId),
    prisma.user.findMany({ where: { companyId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true } }),
    officeUserCount(companyId),
  ]);
  const extra = seatsToBill(access.plan, officeUsers);
  const isAdmin = role === "ADMIN";
  const input = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/settings" className="text-xs font-medium text-zinc-400 hover:text-zinc-700">
          ← Settings
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900">Team</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {access.onTrial
            ? `Free trial: up to ${access.maxOfficeUsers} office users.`
            : access.maxOfficeUsers !== null
              ? `${PLANS[access.plan].name} is for one user.`
              : `${PLANS[access.plan].name} includes 1 user. Each extra office user is ${formatPrice(EXTRA_USER_CENTS)}/mo${extra > 0 ? `, so ${extra} extra now (${formatPrice(extra * EXTRA_USER_CENTS)}/mo)` : ""}.`}{" "}
          Drivers are unlimited and free.
        </p>
      </div>

      {sp.error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      {sp.added && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Added.</p>}
      {sp.removed && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Removed.</p>}

      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{u.name || u.email}</p>
              <p className="truncate text-xs text-zinc-500">
                {u.email} · {ROLE_LABEL[u.role]}
              </p>
            </div>
            {isAdmin && u.id !== userId && (
              <form action={removeTeamMember.bind(null, u.id)}>
                <button type="submit" className="text-xs font-medium text-red-600 hover:text-red-800">
                  Remove
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <form action={addTeamMember} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-zinc-900">Add a person</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Name" required className={input} />
            <input name="email" type="email" placeholder="Email" required className={input} />
            <input name="password" type="password" placeholder="Starting password (8+ characters)" minLength={8} required className={input} />
            <select name="role" defaultValue="DISPATCHER" className={input}>
              <option value="DISPATCHER">Dispatcher (office user)</option>
              <option value="ADMIN">Admin (office user)</option>
              <option value="CREW">Driver (free)</option>
            </select>
          </div>
          <button type="submit" className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
