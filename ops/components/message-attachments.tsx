"use client";

import { useState, useTransition } from "react";
import { formatBytes } from "@/lib/comm-attachment-constants";
import { saveEmailPhotoToJob } from "@/app/(dashboard)/jobs/[id]/actions";

export interface MessageAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Photos (as thumbnails) and documents (as download chips) on a message in the conversation. */
export function MessageAttachments({ attachments, jobId }: { attachments: MessageAttachment[]; jobId?: string | null }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (attachments.length === 0) return null;

  const photos = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const docs = attachments.filter((a) => !a.mimeType.startsWith("image/"));

  return (
    <div className="mt-2 flex flex-col gap-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((a) => (
            <div key={a.id} className="flex w-24 flex-col gap-1">
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" title={a.filename}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/attachments/${a.id}`} alt={a.filename} className="h-24 w-24 rounded-lg border border-zinc-200 object-cover" />
              </a>
              {jobId && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await saveEmailPhotoToJob(a.id, jobId);
                      setNotice(res.ok ? "Saved to job photos." : (res.error ?? "Couldn't save."));
                    })
                  }
                  className="text-left text-[11px] font-medium text-brand hover:underline disabled:opacity-50"
                >
                  Save to job photos
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {docs.map((a) => (
        <a
          key={a.id}
          href={`/api/attachments/${a.id}`}
          className="flex w-fit max-w-full items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
        >
          <span>📄</span>
          <span className="truncate font-medium">{a.filename}</span>
          <span className="shrink-0 text-zinc-400">{formatBytes(a.sizeBytes)}</span>
        </a>
      ))}
      {notice && <p className="text-xs text-zinc-500">{notice}</p>}
    </div>
  );
}
