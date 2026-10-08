"use client";

import { useRef, useState } from "react";

const MAX_SECONDS = 180;

// Browsers record webm/mp4; the AI endpoint wants WAV, so decode and re-encode as 16 kHz mono.
export async function toWav(blob: Blob): Promise<Blob> {
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

/**
 * Microphone recorder shared by the voice features. Shows live text from the browser's own speech
 * recognition (preview only), stops when the speaker says "end", and hands the finished recording
 * to `onAudio` as a WAV blob.
 */
export function useVoiceRecorder(onAudio: (wav: Blob) => void, options: { endCommand?: boolean; minMs?: number } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speech = useRef<{ stop: () => void } | null>(null);
  const onAudioRef = useRef(onAudio);
  onAudioRef.current = onAudio;
  const endCommand = options.endCommand ?? true;
  const minMs = options.minMs ?? 0;
  const stopRequested = useRef(false);
  const startedAt = useRef(0);

  function startLiveText() {
    setLiveText("");
    const w = window as unknown as {
      SpeechRecognition?: new () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
      webkitSpeechRecognition?: new () => any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) return;
    try {
      const sr = new Recognition();
      sr.continuous = true;
      sr.interimResults = true;
      sr.lang = "en-US";
      sr.onresult = (e: { results: ArrayLike<{ 0: { transcript: string } }> }) => {
        const text = Array.from(e.results, (r) => r[0].transcript).join(" ");
        setLiveText(text);
        // Saying "end" stops the recording. Wait a beat so "end of the driveway" doesn't trigger it.
        if (endTimer.current) clearTimeout(endTimer.current);
        if (endCommand && /\bend[.!?]?\s*$/i.test(text.trim())) endTimer.current = setTimeout(stop, 1200);
      };
      sr.onerror = () => {};
      sr.start();
      speech.current = sr;
    } catch {
      speech.current = null;
    }
  }

  async function start() {
    setError(null);
    stopRequested.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Released before the microphone was ready (hold-to-talk): don't start a recording nobody will stop.
      if (stopRequested.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (Date.now() - startedAt.current < minMs) {
          setError("Hold the button while you speak.");
          return;
        }
        toWav(new Blob(chunks.current, { type: rec.mimeType }))
          .then((wav) => onAudioRef.current(wav))
          .catch(() => setError("Couldn't read that recording. Try again."));
      };
      rec.start();
      startedAt.current = Date.now();
      recorder.current = rec;
      startLiveText();
      setSeconds(0);
      setRecording(true);
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
    if (endTimer.current) clearTimeout(endTimer.current);
    try {
      speech.current?.stop();
    } catch {}
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    else stopRequested.current = true;
  }

  return { recording, seconds, liveText, error, setError, start, stop };
}
