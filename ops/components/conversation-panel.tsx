"use client";

import { useEffect, useRef, useState } from "react";
import { MessageAttachments, type MessageAttachment } from "@/components/message-attachments";
import { MessageComposer } from "@/components/message-composer";
import { SenderWarning } from "@/components/sender-warning";

export interface ConversationMessage {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  channel: "EMAIL" | "SMS";
  body: string;
  createdAt: string;
  attachments: MessageAttachment[];
  /** A customer message nobody had opened before this visit. */
  isNew: boolean;
  /** False for an inbound email from an address other than the customer's on file. */
  senderVerified: boolean;
  /** The estimate or invoice this message belongs to; shown as a link when a thread spans several. */
  context?: { label: string; href: string };
}

export interface ComposerTarget {
  customerId: string;
  /** True when this customer can be texted (a phone number and texting set up). */
  canText: boolean;
  /** True when this customer has an email address on file. */
  canEmail: boolean;
  estimateId?: string;
  invoiceId?: string;
  /** In the Inbox, the customer's estimates and invoices, so the reply can be tied to the right one. */
  documents?: { kind: "estimate" | "invoice"; id: string; label: string }[];
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Turns links in a message into clickable ones. Long links wrap instead of running out of the card.
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="text-brand underline [overflow-wrap:anywhere]">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type Tab = "EMAIL" | "SMS";

export function ConversationPanel({
  customerName,
  messages,
  composer,
  jobId,
}: {
  customerName: string;
  messages: ConversationMessage[];
  composer?: ComposerTarget;
  /** When set, photos the customer sends can be saved to this job. */
  jobId?: string | null;
}) {
  // Open on whichever channel was used last; with no history, text if it's available and email otherwise.
  const last = messages[messages.length - 1];
  const [tab, setTab] = useState<Tab>(last ? last.channel : composer?.canText ? "SMS" : "EMAIL");

  // Which estimate or invoice a reply is about (Inbox only): defaults to what the composer was given.
  const [docKey, setDocKey] = useState(
    composer?.estimateId ? `estimate:${composer.estimateId}` : composer?.invoiceId ? `invoice:${composer.invoiceId}` : "",
  );
  const docs = composer?.documents ?? [];
  const chosenDoc = docs.find((d) => `${d.kind}:${d.id}` === docKey);
  const target = composer
    ? chosenDoc
      ? { ...composer, estimateId: chosenDoc.kind === "estimate" ? chosenDoc.id : undefined, invoiceId: chosenDoc.kind === "invoice" ? chosenDoc.id : undefined }
      : composer
    : undefined;

  // The message list scrolls inside the card (so the page doesn't keep growing) and stays pinned to the newest message.
  const listRef = useRef<HTMLDivElement>(null);
  const shown = messages.filter((m) => m.channel === tab);
  const lastShownId = shown[shown.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [tab, lastShownId]);
  const count = (c: Tab) => messages.filter((m) => m.channel === c).length;
  const unread = (c: Tab) => messages.filter((m) => m.channel === c && m.isNew).length;

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6">
      <h2 className="text-sm font-semibold text-zinc-900">Conversation</h2>

      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 text-xs font-semibold">
        {(["EMAIL", "SMS"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setTab(c)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 ${
              tab === c ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {c === "EMAIL" ? "✉ Email" : "💬 Text"}
            <span className="text-zinc-400">{count(c)}</span>
            {unread(c) > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500" title="New messages" />}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <span className="text-2xl">{tab === "EMAIL" ? "✉" : "💬"}</span>
          <p className="text-sm text-zinc-400">{tab === "EMAIL" ? "No emails yet" : "No text messages yet"}</p>
        </div>
      ) : (
        <div ref={listRef} className="flex max-h-[min(30rem,60vh)] flex-col gap-4 overflow-y-auto pr-2">
          {shown.map((m) => (
            <div
              key={m.id}
              className={`min-w-0 border-l-2 pl-3 ${m.direction === "OUTBOUND" ? "border-brand/40" : "border-emerald-400"}`}
            >
              {m.context && (
                <a
                  href={m.context.href}
                  className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold hover:opacity-80 ${
                    m.context.label.startsWith("Invoice") ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                  }`}
                >
                  📄 {m.context.label}
                </a>
              )}
              <p className="mb-1 text-xs text-zinc-400">
                {m.direction === "OUTBOUND" ? `You ${m.channel === "SMS" ? "texted" : "emailed"} ${customerName}` : `${customerName} replied`}{" "}
                · {formatTimestamp(m.createdAt)}
                {m.isNew && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">New</span>}
              </p>
              <p className="whitespace-pre-line text-sm text-zinc-700 [overflow-wrap:anywhere]">
                <Linkified text={m.body} />
              </p>
              {m.direction === "INBOUND" && !m.senderVerified ? (
                <SenderWarning communicationId={m.id} attachmentCount={m.attachments.length} />
              ) : (
                <MessageAttachments attachments={m.attachments} jobId={jobId} />
              )}
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="shrink-0 font-medium">Replying about</span>
          <select
            value={docKey}
            onChange={(e) => setDocKey(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none focus:border-brand"
          >
            {!chosenDoc && <option value="">No estimate or invoice</option>}
            {docs.map((d) => (
              <option key={`${d.kind}:${d.id}`} value={`${d.kind}:${d.id}`}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {target && <MessageComposer key={`${tab}-${docKey}`} mode={tab} customerName={customerName} {...target} />}
    </div>
  );
}
