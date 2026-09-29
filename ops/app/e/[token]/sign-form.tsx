"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signEstimate, declineEstimate } from "./actions";

export function SignForm({ token }: { token: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#18181b";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasInk(true);
  }

  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasInk(false);
  }

  function submit() {
    setError(null);
    if (!hasInk) return setError("Please draw your signature in the box.");
    if (!name.trim()) return setError("Please type your full name.");
    if (!agreed) return setError("Please confirm you agree to the estimate.");
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    startTransition(async () => {
      const res = await signEstimate(token, { name, signatureDataUrl: dataUrl });
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else window.location.reload();
    });
  }

  function decline() {
    if (!confirm("Decline this estimate?")) return;
    startTransition(async () => {
      const res = await declineEstimate(token);
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-bold text-zinc-900">Approve this estimate</h2>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700">Draw your signature</label>
          <button type="button" onClick={clear} className="text-xs font-semibold text-brand hover:underline">
            Clear
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
          className="h-36 w-full touch-none rounded-lg border border-zinc-300 bg-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="signName" className="text-sm font-medium text-zinc-700">
          Full name
        </label>
        <input
          id="signName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
        <span>I have reviewed this estimate and authorize the work described above.</span>
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {isPending ? "Submitting…" : "Sign & approve"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={decline}
          className="text-sm font-medium text-zinc-500 hover:text-red-600"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
