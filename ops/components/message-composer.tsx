"use client";

import { useRef, useState, useTransition } from "react";
import { sendCustomerSms } from "@/app/(dashboard)/sms-actions";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS, formatBytes } from "@/lib/comm-attachment-constants";

/**
 * "Message the customer" box under the Conversation panel. Sends a text when
 * texting is set up for this customer, otherwise an email. Attaching photos
 * or documents always sends an email.
 */
export function MessageComposer({
  customerId,
  customerName,
  channel,
  canEmail,
  estimateId,
  invoiceId,
}: {
  customerId: string;
  customerName: string;
  channel: "sms" | "email" | null;
  canEmail: boolean;
  estimateId?: string;
  invoiceId?: string;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  if (!channel) {
    return (
      <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
        Add a phone number or email address to message {customerName}.
      </p>
    );
  }

  const verb = files.length > 0 ? "Email" : channel === "sms" ? "Text" : "Email";

  function send() {
    setError(null);
    const data = new FormData();
    for (const f of files) data.append("files", f);
    startTransition(async () => {
      const res = await sendCustomerSms({ customerId, body, estimateId, invoiceId }, data);
      if (!res.ok) return setError(res.error);
      setBody("");
      setFiles([]);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={600}
        placeholder={`${verb} ${customerName}…`}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {channel === "email" && files.length === 0 && (
        <p className="text-xs text-zinc-400">Texting isn&apos;t available for this customer, so this will be sent by email.</p>
      )}
      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700">
              <span className="truncate">
                {f.type.startsWith("image/") ? "🖼" : "📄"} {f.name} <span className="text-zinc-400">{formatBytes(f.size)}</span>
              </span>
              <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="shrink-0 text-zinc-400 hover:text-zinc-700">
                ✕
              </button>
            </li>
          ))}
          <li className="text-xs text-zinc-400">Attachments are sent by email.</li>
        </ul>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        <div>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              const next = [...files, ...picked].slice(0, MAX_ATTACHMENTS);
              if (next.reduce((sum, f) => sum + f.size, 0) > 35 * 1024 * 1024) {
                setError("Attachments can be 35 MB in total per email.");
              } else {
                setError(null);
                setFiles(next);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={!canEmail || isPending}
            title={canEmail ? "Attach photos or documents (sent by email)" : "Add an email address to send attachments"}
            onClick={() => fileInput.current?.click()}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            📎 Attach
          </button>
        </div>
        <button
          onClick={send}
          disabled={isPending || (!body.trim() && files.length === 0)}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Sending…" : `Send ${verb.toLowerCase()}`}
        </button>
      </div>
    </div>
  );
}
