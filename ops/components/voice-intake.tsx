"use client";

import { useRef, useState, useTransition } from "react";
import { createDraftFromVoice } from "@/app/(dashboard)/estimates/actions";

const MAX_SECONDS = 180;
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
}

// Browsers record webm/mp4; the AI endpoint wants WAV, so decode and re-encode as 16 kHz mono.
async function toWav(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const samples = (await offline.startRendering()).getChannelData(0);

  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  return new Blob([buf], { type: "audio/wav" });
}

export function VoiceIntake({ defaultState }: { defaultState: string | null }) {
  const [phase, setPhase] = useState<"idle" | "recording" | "processing" | "review">("idle");
  const [seconds, setSeconds] = useState(0);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [match, setMatch] = useState<{ id: string; label: string } | null>(null);
  const [useMatch, setUseMatch] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void process(new Blob(chunks.current, { type: rec.mimeType }));
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setPhase("recording");
      timer.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Couldn't access the microphone. Allow microphone access for this site and try again.");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  async function process(blob: Blob) {
    setPhase("processing");
    try {
      const form = new FormData();
      form.append("audio", await toWav(blob), "intake.wav");
      const res = await fetch("/api/estimates/voice-intake", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Voice intake failed.");
      setIntake({ ...data.intake, state: defaultState || data.intake.state });
      setMatch(data.match);
      setUseMatch(true);
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Voice intake failed.");
      setPhase("idle");
    }
  }

  function accept() {
    if (!intake) return;
    setError(null);
    startTransition(async () => {
      const res = await createDraftFromVoice({
        existingCustomerId: match && useMatch ? match.id : undefined,
        customer: intake,
        jobNotes: intake.jobNotes,
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
            Say the customer&apos;s name, address, email and phone, then describe the job. Review it, accept, then add photos and services.
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

      {error && <p className="text-sm text-red-600">{error}</p>}

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
          <textarea rows={3} className={inputClass} placeholder="Job description" value={intake.jobNotes} onChange={set("jobNotes")} />
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
                setPhase("idle");
                setIntake(null);
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
