"use client";

import { useState } from "react";
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

  const shown = messages.filter((m) => m.channel === tab);
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
        <div className="flex flex-col gap-4">
          {shown.map((m) => (
            <div
              key={m.id}
              className={`min-w-0 border-l-2 pl-3 ${m.direction === "OUTBOUND" ? "border-brand/40" : "border-emerald-400"}`}
            >
              <p className="mb-1 text-xs text-zinc-400">
                {m.direction === "OUTBOUND" ? `You ${m.channel === "SMS" ? "texted" : "emailed"} ${customerName}` : `${customerName} replied`}{" "}
                · {formatTimestamp(m.createdAt)}
                {m.context && (
                  <>
                    {" · "}
                    <a href={m.context.href} className="font-medium text-brand hover:underline">
                      {m.context.label}
                    </a>
                  </>
                )}
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

      {composer && <MessageComposer key={tab} mode={tab} customerName={customerName} {...composer} />}
    </div>
  );
}
