"use client";

import { useState } from "react";
import { useVoiceRecorder } from "@/components/use-voice-recorder";
import { IntakeReview, type IntakeResult } from "@/components/intake-review";

const EXAMPLES = [
  "New estimate for John Smith, 123 Main St Orlando, 407-555-0123. Garage cleanout, couch and two mattresses. Thursday at 2. 3 truckload.",
];

/**
 * Dashboard command center: hold the button and talk (walkie-talkie style) or type, and the request is turned into a
 * reviewable estimate draft. Estimates are the only command so far.
 */
export function CommandCenter({ defaultState }: { defaultState: string | null }) {
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<(IntakeResult & { viaVoice: boolean }) | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(payload: { audio?: Blob; text?: string }) {
    setProcessing(true);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      if (payload.audio) form.append("audio", payload.audio, "command.wav");
      if (payload.text) form.append("text", payload.text);
      const res = await fetch("/api/estimates/voice-intake", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That didn't work. Try again.");
      if (data.intent !== "new_estimate") {
        setNotice("I can only draft estimates for now. Try something like: “New estimate for John Smith at 123 Main St…”");
        return;
      }
      setResult({ intake: data.intake, match: data.match, items: data.items, unmatched: data.unmatched, viaVoice: !!payload.audio });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  // Hold-to-talk: no auto "end" word, and a quick tap is ignored.
  const rec = useVoiceRecorder((wav) => void submit({ audio: wav }), { endCommand: false, minMs: 600 });
  const busy = processing || !!result;
  const shownError = error ?? rec.error;

  function sendText() {
    const value = text.trim();
    if (value && !busy) void submit({ text: value });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Command center</h2>
          <p className="text-xs text-zinc-500">Hold the mic and say it, or type it. Customer, address, the job, when, and what to charge.</p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 sm:inline-flex">
          Intent: Estimate
        </span>
      </div>

      <div className="flex items-start gap-3">
        <button
          type="button"
          aria-label="Hold to talk"
          disabled={busy}
          onPointerDown={(e) => {
            if (busy || e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            void rec.start();
          }}
          onPointerUp={() => rec.stop()}
          onPointerCancel={() => rec.stop()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat && !busy) {
              e.preventDefault();
              void rec.start();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") rec.stop();
          }}
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: "none" }}
          className={`flex h-16 w-16 shrink-0 select-none flex-col items-center justify-center rounded-full text-white shadow-md transition disabled:opacity-40 ${
            rec.recording ? "scale-110 bg-red-600 ring-4 ring-red-200" : "bg-brand hover:opacity-90"
          }`}
        >
          <span className="text-xl leading-none">🎤</span>
          <span className="mt-0.5 text-[10px] font-semibold">{rec.recording ? `${rec.seconds}s` : "HOLD"}</span>
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {rec.recording || processing ? (
            <p className="min-h-16 rounded-lg bg-zinc-50 px-3 py-2 text-sm italic text-zinc-600">
              {processing ? "Working on it…" : rec.liveText || "Listening… release to send"}
            </p>
          ) : (
            <>
              <textarea
                rows={2}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendText();
                  }
                }}
                placeholder={EXAMPLES[0]}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Enter to send, Shift+Enter for a new line</span>
                <button
                  type="button"
                  onClick={sendText}
                  disabled={busy || !text.trim()}
                  className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {shownError && <p className="text-sm text-red-600">{shownError}</p>}
      {notice && <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">{notice}</p>}

      {result && (
        <IntakeReview
          result={result}
          defaultState={defaultState}
          discardLabel="Discard"
          heardLabel={result.viaVoice ? "What I heard" : "What you typed"}
          onDiscard={() => {
            setResult(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
