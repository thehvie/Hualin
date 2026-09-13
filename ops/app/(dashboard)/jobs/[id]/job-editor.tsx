"use client";

import { useState, useTransition } from "react";
import { updateJob, createEstimateForJob, addJobAttachments, removeJobAttachment } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  UNSCHEDULED: "Unscheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ESTIMATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Unsent",
  SENT: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
  EXPIRED: "Archived",
};

const TABS = [
  { id: "details", label: "Details" },
  { id: "estimates", label: "Estimates" },
  { id: "attachments", label: "Attachments" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface JobData {
  id: string;
  status: string;
  scheduledAt: string | null;
  notes: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  property: { addressLine1: string; addressLine2: string | null; city: string; state: string; zip: string } | null;
  estimates: { id: string; number: number; status: string; invoiceId: string | null; invoiceNumber: number | null }[];
  attachments: { id: string; filename: string; dataUrl: string }[];
}

export function JobEditor({ job }: { job: JobData }) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("details");
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ dataUrl: string; filename: string } | null>(null);

  function save(overrides: Record<string, string>) {
    const fd = new FormData();
    fd.set("status", job.status);
    fd.set("scheduledAt", toDatetimeLocal(job.scheduledAt));
    fd.set("notes", job.notes || "");
    for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
    startTransition(async () => {
      await updateJob(job.id, fd);
      setNotice("Saved.");
    });
  }

  function handleNewEstimate() {
    startTransition(() => createEstimateForJob(job.id));
  }

  function uploadPhotos(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setPhotoError(null);
    const fd = new FormData();
    for (const file of images) fd.append("photos", file);
    startTransition(async () => {
      const res = await addJobAttachments(job.id, fd);
      if (!res.ok) setPhotoError(res.error || "Could not upload photos.");
    });
  }

  function handleRemovePhoto(attachmentId: string) {
    startTransition(() => removeJobAttachment(job.id, attachmentId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Job — {job.customer.name}</h1>
        <select
          defaultValue={job.status}
          disabled={isPending}
          onChange={(e) => save({ status: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 outline-none focus:border-brand"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold">✕</button>
        </div>
      )}

      <div className="flex gap-5 border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm font-semibold ${
              tab === t.id ? "border-brand text-brand-dark" : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "details" && (
        <>
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Customer</p>
              <a href={`/customers/${job.customer.id}`} className="mt-1 block font-medium text-zinc-900 hover:text-brand">
                {job.customer.name}
              </a>
              {job.customer.email && <p className="text-sm text-zinc-500">{job.customer.email}</p>}
              {job.customer.phone && <p className="text-sm text-zinc-500">{job.customer.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Service address</p>
              {job.property ? (
                <p className="mt-1 text-sm text-zinc-700">
                  {job.property.addressLine1}{job.property.addressLine2 ? `, ${job.property.addressLine2}` : ""}
                  <br />
                  {job.property.city}, {job.property.state} {job.property.zip}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">No property on file</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Scheduled for</p>
            <input
              type="datetime-local"
              defaultValue={toDatetimeLocal(job.scheduledAt)}
              disabled={isPending}
              onChange={(e) => save({ scheduledAt: e.target.value })}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Notes</p>
            <textarea
              defaultValue={job.notes || ""}
              rows={4}
              disabled={isPending}
              onBlur={(e) => save({ notes: e.target.value })}
              placeholder="Job notes…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </>
      )}

      {tab === "estimates" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Estimates</p>
            <button
              onClick={handleNewEstimate}
              disabled={isPending}
              className="text-xs font-semibold text-brand hover:underline"
            >
              + New estimate
            </button>
          </div>
          {job.estimates.length === 0 ? (
            <p className="text-sm text-zinc-400">No estimates yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {job.estimates.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <a href={`/estimates/${e.id}`} className="font-medium text-zinc-900 hover:text-brand">
                    Estimate #{e.number}
                    <span className="ml-2 font-normal text-zinc-400">{ESTIMATE_STATUS_LABELS[e.status] ?? e.status}</span>
                  </a>
                  {e.invoiceId ? (
                    <a href={`/invoices/${e.invoiceId}`} className="font-medium text-brand hover:underline">
                      Invoice #{e.invoiceNumber} →
                    </a>
                  ) : (
                    <span className="text-zinc-400">No invoice yet</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "attachments" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Photos</p>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(true);
            }}
            onDragLeave={() => setIsDraggingPhoto(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingPhoto(false);
              uploadPhotos(Array.from(e.dataTransfer.files || []));
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
              isDraggingPhoto ? "border-brand bg-brand/10" : "border-brand/40 bg-brand/5 hover:bg-brand/10"
            }`}
          >
            <span className="text-sm font-semibold text-brand-dark">Drag and drop photos here</span>
            <span className="text-xs text-zinc-400">or</span>
            <span className="rounded-full border border-brand/40 bg-white px-3 py-1 text-xs font-semibold text-brand-dark shadow-sm">
              Browse files
            </span>
            <span className="text-xs text-zinc-400">Up to 5 photos total, 8MB each</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isPending}
              className="hidden"
              onChange={(e) => {
                uploadPhotos(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
          </label>

          {photoError && <p className="mt-2 text-sm text-red-600">{photoError}</p>}

          {job.attachments.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">No photos yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              {job.attachments.map((a) => (
                <div key={a.id} className="group relative overflow-hidden rounded-lg border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto({ dataUrl: a.dataUrl, filename: a.filename })}
                    className="block"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.dataUrl} alt={a.filename} className="h-24 w-24 object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(a.id)}
                    disabled={isPending}
                    className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white group-hover:flex"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxPhoto.dataUrl}
            alt={lightboxPhoto.filename}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
