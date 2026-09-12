export interface ConversationMessage {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  channel: "EMAIL" | "SMS";
  body: string;
  createdAt: string;
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
}: {
  customerName: string;
  messages: ConversationMessage[];
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
                {m.direction === "OUTBOUND" ? `You emailed ${customerName}` : `${customerName} replied`} ·{" "}
                {formatTimestamp(m.createdAt)}
              </p>
              <p className="whitespace-pre-line text-sm text-zinc-700">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
