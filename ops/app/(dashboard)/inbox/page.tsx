import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { messageChannel } from "@/lib/messaging";
import { ConversationPanel } from "@/components/conversation-panel";

const THREAD_LIMIT = 100;

function ago(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string; unread?: string }> }) {
  const { companyId } = await requireSession();
  const { c, unread: unreadOnly } = await searchParams;

  const [latest, unreadGroups] = await Promise.all([
    prisma.communication.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      distinct: ["customerId"],
      take: THREAD_LIMIT,
      include: {
        customer: true,
        estimate: { select: { number: true } },
        invoice: { select: { number: true } },
      },
    }),
    prisma.communication.groupBy({
      by: ["customerId"],
      where: { companyId, direction: "INBOUND", readAt: null },
      _count: { _all: true },
    }),
  ]);
  const unreadBy = new Map(unreadGroups.map((g) => [g.customerId, g._count._all]));
  const threads = latest.filter((m) => !unreadOnly || unreadBy.has(m.customerId));

  const selectedId = c ?? threads[0]?.customerId;
  const selected = selectedId ? await prisma.customer.findFirst({ where: { id: selectedId, companyId } }) : null;

  let panel: React.ReactNode = null;
  if (selected) {
    const messages = await prisma.communication.findMany({
      where: { customerId: selected.id, companyId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        estimate: { select: { id: true, number: true } },
        invoice: { select: { id: true, number: true } },
        attachments: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } },
      },
    });
    messages.reverse();

    // Opening a conversation counts as reading it (the messages stay flagged New on this visit).
    await prisma.communication.updateMany({
      where: { customerId: selected.id, companyId, direction: "INBOUND", readAt: null },
      data: { readAt: new Date() },
    });

    // Email replies are routed by estimate/invoice, so answer from the document the customer last wrote about.
    const lastDoc = [...messages].reverse().find((m) => m.estimateId || m.invoiceId);
    let estimateId = lastDoc?.estimateId ?? undefined;
    let invoiceId = lastDoc?.invoiceId ?? undefined;
    if (!estimateId && !invoiceId) {
      const est = await prisma.estimate.findFirst({
        where: { customerId: selected.id, companyId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      estimateId = est?.id;
      if (!est) {
        const inv = await prisma.invoice.findFirst({
          where: { customerId: selected.id, companyId },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        invoiceId = inv?.id;
      }
    }

    const [estimates, invoices] = await Promise.all([
      prisma.estimate.findMany({ where: { customerId: selected.id, companyId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, createdAt: true } }),
      prisma.invoice.findMany({ where: { customerId: selected.id, companyId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, number: true, createdAt: true } }),
    ]);
    const documents = [
      ...estimates.map((e) => ({ kind: "estimate" as const, id: e.id, label: `Estimate #${e.number}`, at: e.createdAt.getTime() })),
      ...invoices.map((i) => ({ kind: "invoice" as const, id: i.id, label: `Invoice #${i.number}`, at: i.createdAt.getTime() })),
    ]
      .sort((a, b) => b.at - a.at)
      .map(({ kind, id, label }) => ({ kind, id, label }));

    panel = (
      <ConversationPanel
        customerName={`${selected.firstName} ${selected.lastName}`}
        messages={messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          channel: m.channel,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          attachments: m.attachments,
          isNew: m.direction === "INBOUND" && !m.readAt,
          senderVerified: m.senderVerified,
          context: m.estimate
            ? { label: `Estimate #${m.estimate.number}`, href: `/estimates/${m.estimate.id}` }
            : m.invoice
              ? { label: `Invoice #${m.invoice.number}`, href: `/invoices/${m.invoice.id}` }
              : undefined,
        }))}
        composer={{
          customerId: selected.id,
          canText: messageChannel(selected) === "sms",
          canEmail: !!selected.email,
          estimateId,
          invoiceId,
          documents,
        }}
      />
    );
  }

  const explicit = !!c;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inbox</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Every customer conversation in one place. They also stay on each estimate and invoice.
          </p>
        </div>
        <Link
          href={unreadOnly ? "/inbox" : "/inbox?unread=1"}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            unreadOnly ? "border-brand bg-brand/10 text-brand-dark" : "border-zinc-300 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Unread only
        </Link>
      </div>

      {latest.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-400">
          <span className="mb-1 block text-2xl">💬</span>
          No messages yet. Texts and emails with your customers will show up here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <ul
            className={`flex flex-col divide-y divide-zinc-100 self-start overflow-hidden rounded-xl border border-zinc-200 bg-white ${
              explicit ? "hidden lg:flex" : ""
            }`}
          >
            {threads.length === 0 && <li className="p-6 text-center text-sm text-zinc-400">No unread messages.</li>}
            {threads.map((m) => {
              const n = unreadBy.get(m.customerId) ?? 0;
              const active = m.customerId === selectedId;
              return (
                <li key={m.customerId}>
                  <Link
                    href={`/inbox?c=${m.customerId}${unreadOnly ? "&unread=1" : ""}`}
                    className={`flex flex-col gap-0.5 px-4 py-3 ${active ? "bg-brand/5" : "hover:bg-zinc-50"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm text-zinc-900 ${n > 0 ? "font-bold" : "font-medium"}`}>
                        {m.customer.firstName} {m.customer.lastName}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">{ago(m.createdAt)}</span>
                    </span>
                    {(m.estimate || m.invoice) && (
                      <span className="text-[11px] font-semibold text-sky-700">
                        📄 {m.estimate ? `Estimate #${m.estimate.number}` : `Invoice #${m.invoice!.number}`}
                      </span>
                    )}
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-zinc-500">
                        {m.channel === "SMS" ? "💬" : "✉"} {m.direction === "OUTBOUND" ? "You: " : ""}
                        {m.body}
                      </span>
                      {n > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {n}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className={`min-w-0 ${explicit ? "" : "hidden lg:block"}`}>
            {selected && (
              <Link
                href={unreadOnly ? "/inbox?unread=1" : "/inbox"}
                className="mb-3 block text-sm font-medium text-brand hover:underline lg:hidden"
              >
                ← All conversations
              </Link>
            )}
            {panel ?? <p className="p-6 text-center text-sm text-zinc-400">Select a conversation.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
