"use client";

import { useState, useTransition } from "react";
import { connectOwnMailgun, disconnectOwnMailgun, sendTestEmail } from "./email-actions";
import { SHARED_EMAIL_DAYS } from "@/lib/mail-config-constants";

export type EmailState =
  | { mode: "own"; domain: string; fromEmail: string; region: string; hasSigningKey: boolean }
  | { mode: "exempt" }
  | { mode: "shared"; daysLeft: number }
  | { mode: "expired" };

const input =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

function Copy({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs break-all">{value}</code>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(value).then(() => setDone(true))}
        className="text-xs font-medium text-brand hover:underline"
      >
        {done ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

export function EmailCard({ state, appUrl }: { state: EmailState; appUrl: string }) {
  const [editing, setEditing] = useState(state.mode !== "own" && state.mode !== "exempt" && state.mode !== "shared");
  const [domain, setDomain] = useState(state.mode === "own" ? state.domain : "");
  const [region, setRegion] = useState(state.mode === "own" ? state.region : "us");
  const [apiKey, setApiKey] = useState("");
  const [signingKey, setSigningKey] = useState("");
  const [fromEmail, setFromEmail] = useState(state.mode === "own" ? state.fromEmail : "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const routeDomain = domain.trim().toLowerCase() || "your-domain.com";
  const routeExpr = `match_recipient("^(invoice|estimate)-.+@${routeDomain.replace(/\./g, "\\.")}$")`;
  const forwardUrl = `${appUrl}/api/mailgun/inbound`;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      setMessage(null);
      const res = await fn();
      setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Done.") : (res.error ?? "Something went wrong.") });
      if (res.ok) {
        setApiKey("");
        setSigningKey("");
      }
    });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Email</h2>
        <p className="mt-1 text-xs text-zinc-500">How emails to your customers are sent, and where their replies come back to.</p>
      </div>

      {state.mode === "own" && !editing && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          <strong>Using your own Mailgun account</strong> · sending from {state.fromEmail}
        </div>
      )}
      {state.mode === "exempt" && !editing && (
        <div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">Using the shared sender. No time limit on this account.</div>
      )}
      {state.mode === "shared" && !editing && (
        <div className={`rounded-lg p-3 text-sm ${state.daysLeft <= 14 ? "bg-amber-50 text-amber-900" : "bg-zinc-50 text-zinc-700"}`}>
          <strong>Using the shared sender</strong> for {state.daysLeft} more day{state.daysLeft === 1 ? "" : "s"}. It works with no setup for the first{" "}
          {SHARED_EMAIL_DAYS} days. After that, connect your own Mailgun account to keep sending.
        </div>
      )}
      {state.mode === "expired" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Email is paused.</strong> Your {SHARED_EMAIL_DAYS}-day trial of the shared sender has ended. Connect your own Mailgun account below to start
          sending again.
        </div>
      )}

      {editing || state.mode === "expired" ? (
        <div className="flex flex-col gap-3">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-600">
            <li>Create a free account at mailgun.com and add and verify your sending domain (Mailgun shows the DNS records to add).</li>
            <li>In Mailgun, copy your <strong>Private API key</strong> and your <strong>HTTP webhook signing key</strong> (Settings → API Security).</li>
            <li>Fill in the form below and press Connect. We check it with Mailgun first.</li>
            <li>Then add one <strong>Route</strong> in Mailgun so customer replies reach this app (shown after you enter your domain).</li>
          </ol>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Mailgun sending domain</span>
              <input className={input} placeholder="mg.yourbusiness.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Mailgun region</span>
              <select className={input} value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="us">US</option>
                <option value="eu">EU</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Send from</span>
            <input className={input} placeholder={`noreply@${routeDomain}`} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Private API key</span>
            <input className={input} type="password" autoComplete="off" placeholder="key-…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">HTTP webhook signing key</span>
            <input className={input} type="password" autoComplete="off" placeholder="Used to verify customer replies" value={signingKey} onChange={(e) => setSigningKey(e.target.value)} />
          </label>

          <div className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
            <p className="mb-1.5 font-semibold text-zinc-900">Mailgun Route (Receiving → Routes → Create route)</p>
            <p className="mb-1">Expression type <strong>Custom</strong>:</p>
            <p className="mb-2"><Copy value={routeExpr} /></p>
            <p className="mb-1">Action <strong>Forward</strong> to:</p>
            <p><Copy value={forwardUrl} /></p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => connectOwnMailgun({ domain, region, apiKey, signingKey, fromEmail }))}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Checking with Mailgun…" : "Connect Mailgun"}
            </button>
            {state.mode !== "expired" && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">
                Cancel
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => run(sendTestEmail)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50">
            Send a test email
          </button>
          <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700">
            {state.mode === "own" ? "Change Mailgun settings" : "Use my own Mailgun account"}
          </button>
          {state.mode === "own" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Disconnect your Mailgun account? Email will go back to the shared sender if your trial is still running.")) run(disconnectOwnMailgun);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    </div>
  );
}
