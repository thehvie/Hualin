"use client";

import { useRef, useState, useTransition } from "react";
import { sendCustomerSms } from "@/app/(dashboard)/sms-actions";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS, formatBytes } from "@/lib/comm-attachment-constants";

/**
 * "Message the customer" box under the Conversation panel. `mode` is the tab that's open: a text message, or an
 * email (which can carry photos and documents).
 */
export function MessageComposer({
  customerId,
  customerName,
  mode,
  canText,
  canEmail,
  estimateId,
  invoiceId,
}: {
  customerId: string;
  customerName: string;
  mode: "EMAIL" | "SMS";
  canText: boolean;
  canEmail: boolean;
  estimateId?: string;
  invoiceId?: string;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  if (mode === "SMS" && !canText) {
    return (
      <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
        Texting isn&apos;t available for {customerName}: they need a phone number, and texting has to be set up for your company.
        {canEmail && " Use the Email tab to reach them."}
      </p>
    );
  }
  if (mode === "EMAIL" && !canEmail) {
    return (
      <p className="border-t border-zinc-100 pt-3 text-xs text-zinc-400">
        Add an email address for {customerName} to send them an email.
        {canText && " Use the Text tab to reach them."}
      </p>
    );
  }

  const isEmail = mode === "EMAIL";

  function send() {
    setError(null);
    const data = new FormData();
    for (const f of files) data.append("files", f);
    startTransition(async () => {
      const res = await sendCustomerSms({ customerId, body, estimateId, invoiceId, channel: isEmail ? "email" : "sms" }, data);
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
        placeholder={`${isEmail ? "Email" : "Text"} ${customerName}…`}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
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
        </ul>
      )}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex items-center justify-between">
        {isEmail ? (
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
              disabled={isPending}
              title="Attach photos or documents"
              onClick={() => fileInput.current?.click()}
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              📎 Attach
            </button>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">Texts can&apos;t carry attachments. Use Email for photos.</span>
        )}
        <button
          onClick={send}
          disabled={isPending || (!body.trim() && files.length === 0)}
          className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Sending…" : isEmail ? "Send email" : "Send text"}
        </button>
      </div>
    </div>
  );
}
