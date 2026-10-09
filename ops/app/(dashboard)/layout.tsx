import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { unreadMessageCount } from "@/lib/inbox";
import { DashboardNav } from "./dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { companyId } = await requireSession();
  const [company, unread] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }),
    unreadMessageCount(companyId),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 lg:flex-row">
      <DashboardNav companyName={company?.name ?? "Ops"} unreadMessages={unread} />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
