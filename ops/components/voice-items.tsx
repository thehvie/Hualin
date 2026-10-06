"use client";

import { useState, useTransition } from "react";
import { useVoiceRecorder } from "@/components/use-voice-recorder";
import { VoiceItemList, type ItemMatch, type ItemRow } from "@/components/voice-item-list";
import { addLineItemsFromPriceBook } from "@/app/(dashboard)/estimates/[id]/actions";

/** Say "3 truckload, 2 mattress" and review the matched price book items before adding them. */
export function VoiceItems({ estimateId }: { estimateId: string }) {
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<ItemRow[] | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rec = useVoiceRecorder(async (wav) => {
    setProcessing(true);
    try {
      const form = new FormData();
      form.append("audio", wav, "items.wav");
      const res = await fetch("/api/estimates/voice-items", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice request failed.");
      setRows((data.matches as ItemMatch[]).map((m) => ({ ...m, checked: true })));
      setUnmatched(data.unmatched);
      setHeard(data.transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice request failed.");
    } finally {
      setProcessing(false);
    }
  });

  function reset() {
    setRows(null);
    setUnmatched([]);
    setHeard("");
    setError(null);
  }

  function add() {
    const picks = (rows ?? []).filter((r) => r.checked).map((r) => ({ priceBookItemId: r.priceBookItemId, quantity: r.quantity }));
    startTransition(async () => {
      await addLineItemsFromPriceBook(estimateId, picks);
      reset();
    });
  }

  const shownError = error ?? rec.error;
  const selected = (rows ?? []).filter((r) => r.checked);

  return (
    <div className="mb-3 flex flex-col gap-2">
      {!rows && (
        <div className="flex items-center gap-3">
          {!rec.recording && !processing && (
            <button type="button" onClick={rec.start} className="rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand">
              🎤 Add items by voice
            </button>
          )}
          {rec.recording && (
            <button type="button" onClick={rec.stop} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">
              ■ Stop · {Math.floor(rec.seconds / 60)}:{String(rec.seconds % 60).padStart(2, "0")}
            </button>
          )}
          {processing && <span className="text-sm text-zinc-500">Matching to your price book…</span>}
          {!rec.recording && !processing && (
            <span className="text-xs text-zinc-400">e.g. &ldquo;3 truckload, 2 mattress disposal, end&rdquo;</span>
          )}
        </div>
      )}

      {(rec.recording || processing) && (
        <p className="min-h-9 rounded-lg bg-zinc-50 px-3 py-2 text-sm italic text-zinc-600">
          {rec.liveText || (rec.recording ? "Listening…" : "")}
        </p>
      )}

      {shownError && <p className="text-sm text-red-600">{shownError}</p>}

      {rows && (
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <VoiceItemList rows={rows} unmatched={unmatched} onChange={setRows} />
          {heard && (
            <details className="text-xs text-zinc-400">
              <summary className="cursor-pointer">What I heard</summary>
              <p className="mt-1">{heard}</p>
            </details>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={isPending || selected.length === 0}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isPending ? "Adding…" : `Add ${selected.length} item${selected.length === 1 ? "" : "s"}`}
            </button>
            <button type="button" onClick={reset} disabled={isPending} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">
              Re-record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
