"use client";

import { useEffect, useState, useTransition } from "react";
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
  // Index of the photo shown in the full-size viewer, or null when it's closed.
  const [open, setOpen] = useState<number | null>(null);

  const photos = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const docs = attachments.filter((a) => !a.mimeType.startsWith("image/"));

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      else if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((a, i) => (
            <div key={a.id} className="flex w-24 flex-col gap-1">
              <button type="button" onClick={() => setOpen(i)} title={a.filename} className="cursor-zoom-in">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/attachments/${a.id}`} alt={a.filename} className="h-24 w-24 rounded-lg border border-zinc-200 object-cover" />
              </button>
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

      {open !== null && photos[open] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white hover:bg-white/30"
          >
            ✕
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open - 1 + photos.length) % photos.length);
                }}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/30"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((open + 1) % photos.length);
                }}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/30"
              >
                ›
              </button>
            </>
          )}
          <div className="flex max-h-full max-w-full flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/attachments/${photos[open].id}`} alt={photos[open].filename} className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain" />
            <p className="text-xs text-white/80">
              {photos[open].filename}
              {photos.length > 1 && ` · ${open + 1} of ${photos.length}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
