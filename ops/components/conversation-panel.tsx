import { MessageAttachments, type MessageAttachment } from "@/components/message-attachments";
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
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConversationPanel({
  customerName,
  messages,
  composer,
  jobId,
}: {
  customerName: string;
  messages: ConversationMessage[];
  composer?: React.ReactNode;
  /** When set, photos the customer sends can be saved to this job. */
  jobId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6">
      <h2 className="text-sm font-semibold text-zinc-900">Conversation</h2>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-8 text-center">
          <span className="text-2xl">💬</span>
          <p className="text-sm text-zinc-400">No messages yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`border-l-2 pl-3 ${
                m.direction === "OUTBOUND" ? "border-brand/40" : "border-emerald-400"
              }`}
            >
              <p className="mb-1 text-xs text-zinc-400">
                {m.direction === "OUTBOUND"
                  ? `You ${m.channel === "SMS" ? "texted" : "emailed"} ${customerName}`
                  : `${customerName} replied${m.channel === "SMS" ? " by text" : ""}`}{" "}
                ·{" "}
                {formatTimestamp(m.createdAt)}
                {m.isNew && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">New</span>}
              </p>
              <p className="whitespace-pre-line text-sm text-zinc-700">{m.body}</p>
              {m.direction === "INBOUND" && !m.senderVerified ? (
                <SenderWarning communicationId={m.id} attachmentCount={m.attachments.length} />
              ) : (
                <MessageAttachments attachments={m.attachments} jobId={jobId} />
              )}
            </div>
          ))}
        </div>
      )}

      {composer}
    </div>
  );
}
