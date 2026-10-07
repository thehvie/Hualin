"use client";

import { useState, useTransition } from "react";
import { useVoiceRecorder } from "@/components/use-voice-recorder";
import { VoiceItemList, type ItemMatch, type ItemRow } from "@/components/voice-item-list";
import { createDraftFromVoice } from "@/app/(dashboard)/estimates/actions";

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

interface Intake {
  transcript: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  jobNotes: string;
  scheduledAt: string;
  scheduledEndAt: string;
}

export function VoiceIntake({ defaultState }: { defaultState: string | null }) {
  const [processing, setProcessing] = useState(false);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [match, setMatch] = useState<{ id: string; label: string } | null>(null);
  const [useMatch, setUseMatch] = useState(true);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rec = useVoiceRecorder(async (wav) => {
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", wav, "intake.wav");
      const res = await fetch("/api/estimates/voice-intake", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice intake failed.");
      setIntake({ ...data.intake, state: defaultState || data.intake.state });
      setMatch(data.match);
      setUseMatch(true);
      setRows((data.items as ItemMatch[]).map((m) => ({ ...m, checked: true })));
      setUnmatched(data.unmatched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice intake failed.");
    } finally {
      setProcessing(false);
    }
  });

  const phase = rec.recording ? "recording" : processing ? "processing" : intake ? "review" : "idle";
  const { seconds, liveText, start, stop } = rec;
  const shownError = error ?? rec.error;

  function accept() {
    if (!intake) return;
    setError(null);
    startTransition(async () => {
      const res = await createDraftFromVoice({
        existingCustomerId: match && useMatch ? match.id : undefined,
        customer: intake,
        jobNotes: intake.jobNotes,
        scheduledAt: intake.scheduledAt,
        scheduledEndAt: intake.scheduledEndAt,
        items: rows.filter((r) => r.checked).map((r) => ({ priceBookItemId: r.priceBookItemId, quantity: r.quantity })),
      });
      if (res?.error) setError(res.error);
    });
  }

  const set = (k: keyof Intake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setIntake((prev) => (prev ? { ...prev, [k]: e.target.value } : prev));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Voice intake</h2>
          <p className="text-xs text-zinc-500">
            Say the customer&apos;s name, address, email and phone, describe the job, when it&apos;s happening (like &ldquo;Thursday at 2&rdquo; or &ldquo;Monday through Wednesday&rdquo;), then the services to charge (like &ldquo;3 truckload&rdquo;), and say &ldquo;end&rdquo; when you&apos;re done. Review it, accept, then add photos.
          </p>
        </div>
        {phase === "idle" && (
          <button type="button" onClick={start} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
            🎤 Record
          </button>
        )}
        {phase === "recording" && (
          <button type="button" onClick={stop} className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            ■ Stop · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </button>
        )}
        {phase === "processing" && <span className="text-sm text-zinc-500">Transcribing…</span>}
      </div>

      {shownError && <p className="text-sm text-red-600">{shownError}</p>}

      {(phase === "recording" || phase === "processing") && (
        <p className="min-h-10 rounded-lg bg-white/70 px-3 py-2 text-sm italic text-zinc-600">
          {liveText || (phase === "recording" ? "Listening…" : "")}
        </p>
      )}

      {phase === "review" && intake && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
          {match && (
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" checked={useMatch} onChange={(e) => setUseMatch(e.target.checked)} className="mt-0.5" />
              <span>
                <strong>{match.label}</strong> is already a customer with this phone/email. Use the existing customer instead of creating a duplicate.
              </span>
            </label>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className={inputClass} placeholder="First name" value={intake.firstName} onChange={set("firstName")} />
            <input className={inputClass} placeholder="Last name" value={intake.lastName} onChange={set("lastName")} />
            <input className={inputClass} placeholder="Email" value={intake.email} onChange={set("email")} />
            <input className={inputClass} placeholder="Phone" value={intake.phone} onChange={set("phone")} />
            <input className={inputClass} placeholder="Address" value={intake.addressLine1} onChange={set("addressLine1")} />
            <input className={inputClass} placeholder="Unit" value={intake.addressLine2} onChange={set("addressLine2")} />
            <input className={inputClass} placeholder="City" value={intake.city} onChange={set("city")} />
            <input className={inputClass} placeholder="Zip" value={intake.zip} onChange={set("zip")} />
          </div>
          {!defaultState && <input className={inputClass} placeholder="State (2 letters)" value={intake.state} onChange={set("state")} />}
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Job details</p>
          <textarea rows={3} className={inputClass} placeholder="Job details" value={intake.jobNotes} onChange={set("jobNotes")} />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Schedule</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">Start</span>
              <input type="datetime-local" className={inputClass} value={intake.scheduledAt} onChange={set("scheduledAt")} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500">End (multi-day jobs)</span>
              <input
                type="datetime-local"
                className={inputClass}
                value={intake.scheduledEndAt}
                min={intake.scheduledAt || undefined}
                disabled={!intake.scheduledAt}
                onChange={set("scheduledEndAt")}
              />
            </label>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Items from your price book</p>
          <VoiceItemList rows={rows} unmatched={unmatched} onChange={setRows} />
          <details className="text-xs text-zinc-400">
            <summary className="cursor-pointer">What I heard</summary>
            <p className="mt-1 whitespace-pre-wrap">{intake.transcript}</p>
          </details>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={accept}
              disabled={isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Accept & continue"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIntake(null);
                setError(null);
              }}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
            >
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
