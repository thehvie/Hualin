"use client";

import { useState } from "react";
import { useVoiceRecorder } from "@/components/use-voice-recorder";
import { IntakeReview, type IntakeResult } from "@/components/intake-review";

export function VoiceIntake({ defaultState }: { defaultState: string | null }) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rec = useVoiceRecorder(async (wav) => {
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", wav, "intake.wav");
      const res = await fetch("/api/estimates/voice-intake", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice intake failed.");
      setResult({ intake: data.intake, match: data.match, items: data.items, unmatched: data.unmatched });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice intake failed.");
    } finally {
      setProcessing(false);
    }
  });

  const phase = rec.recording ? "recording" : processing ? "processing" : result ? "review" : "idle";
  const { seconds, liveText, start, stop } = rec;
  const shownError = error ?? rec.error;

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

      {phase === "review" && result && (
        <IntakeReview
          result={result}
          defaultState={defaultState}
          discardLabel="Re-record"
          onDiscard={() => {
            setResult(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
