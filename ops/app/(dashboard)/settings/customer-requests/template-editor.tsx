"use client";

import { useMemo, useRef, useState, useTransition } from "react";

import { resetTemplate, saveTemplate, sendTestEmail } from "./actions";
import {
  SAMPLE_VARS,
  TEMPLATE_VARIABLES,
  buildEmailHtml,
  emailExtras,
  renderTemplateText,
  tidy,
  type TemplateContent,
  type TemplateDef,
  type Vars,
} from "@/lib/message-templates";

const field = "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export interface PreviewCompany {
  name: string;
  phone: string | null;
  logoUrl: string | null;
  poweredBy: string | null;
}

/** One message: email on/off with a live preview, text on/off, and the wording for each. */
export function TemplateEditor({
  def,
  initial,
  isCustom,
  canText,
  canEdit,
  company,
}: {
  def: TemplateDef;
  initial: TemplateContent;
  isCustom: boolean;
  canText: boolean;
  canEdit: boolean;
  company: PreviewCompany;
}) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const smsRef = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState<"emailBody" | "smsBody" | "emailSubject" | "emailHeadline">("emailBody");
  const set = <K extends keyof TemplateContent>(k: K, value: TemplateContent[K]) => setV((x) => ({ ...x, [k]: value }));

  const vars = useMemo<Vars>(() => ({ ...SAMPLE_VARS, company_name: company.name, company_phone: company.phone || SAMPLE_VARS.company_phone }), [company]);
  const html = useMemo(
    () =>
      buildEmailHtml({
        companyName: company.name,
        logoUrl: company.logoUrl,
        headline: tidy(renderTemplateText(v.emailHeadline, vars)),
        body: renderTemplateText(v.emailBody, vars),
        ...emailExtras(def.key, vars),
        phone: company.phone,
        sentTo: "customer@example.com",
        poweredBy: company.poweredBy,
      }),
    [v.emailHeadline, v.emailBody, vars, company, def.key],
  );

  function insert(name: string) {
    const token = `{{${name}}}`;
    const el = focus === "emailBody" ? bodyRef.current : focus === "smsBody" ? smsRef.current : null;
    if (focus === "emailBody" || focus === "smsBody") {
      const key = focus;
      const cur = v[key];
      const at = el?.selectionStart ?? cur.length;
      const end = el?.selectionEnd ?? at;
      set(key, cur.slice(0, at) + token + cur.slice(end));
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(at + token.length, at + token.length);
      });
    } else {
      set(focus, v[focus] + token);
    }
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okText: string, after?: () => void) =>
    start(async () => {
      setMsg(null);
      const res = await fn();
      setMsg(res.ok ? { ok: true, text: res.message ?? okText } : { ok: false, text: res.error ?? "Something went wrong." });
      if (res.ok) after?.();
    });

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{def.label}</h2>
        <p className="mt-0.5 text-xs text-zinc-500">{def.when}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <input type="checkbox" checked={v.emailOn} disabled={!canEdit} onChange={(e) => set("emailOn", e.target.checked)} className="h-4 w-4 accent-brand" />
            Email
          </label>
          <div className={`flex flex-col gap-3 ${v.emailOn ? "" : "pointer-events-none opacity-50"}`}>
            <input value={v.emailSubject} disabled={!canEdit} onFocus={() => setFocus("emailSubject")} onChange={(e) => set("emailSubject", e.target.value)} placeholder="Subject" className={field} />
            <input value={v.emailHeadline} disabled={!canEdit} onFocus={() => setFocus("emailHeadline")} onChange={(e) => set("emailHeadline", e.target.value)} placeholder="Headline" className={field} />
            <textarea ref={bodyRef} value={v.emailBody} disabled={!canEdit} onFocus={() => setFocus("emailBody")} onChange={(e) => set("emailBody", e.target.value)} rows={9} className={field} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
            <input type="checkbox" checked={v.smsOn && canText} disabled={!canEdit || !canText} onChange={(e) => set("smsOn", e.target.checked)} className="h-4 w-4 accent-brand" />
            Text message
          </label>
          {!canText && <p className="text-xs text-amber-700">Texting is part of the Base and Plus plans, and your monthly texts must not be used up.</p>}
          <div className={`flex flex-col gap-1 ${v.smsOn && canText ? "" : "pointer-events-none opacity-50"}`}>
            <textarea ref={smsRef} value={v.smsBody} disabled={!canEdit} onFocus={() => setFocus("smsBody")} onChange={(e) => set("smsBody", e.target.value)} rows={5} className={field} />
            <span className={`text-xs ${v.smsBody.length > 320 ? "text-amber-700" : "text-zinc-400"}`}>{v.smsBody.length} characters. Over 160 is sent as more than one text.</span>
          </div>
        </section>
      </div>

      {canEdit && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500">Click to add to the part you are editing:</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_VARIABLES.map((t) => (
              <button key={t.name} type="button" title={t.label} onClick={() => insert(t.name)} className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100">
                {`{{${t.name}}}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {v.emailOn && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-500">Email preview with sample details</p>
          <iframe title={`${def.label} preview`} srcDoc={html} sandbox="" className="h-[520px] w-full rounded-lg border border-zinc-200 bg-zinc-100" />
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={pending} onClick={() => run(() => saveTemplate(def.key, { ...v, smsOn: v.smsOn && canText }), "Saved.")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Working…" : "Save"}
          </button>
          <button type="button" disabled={pending || !v.emailOn} onClick={() => run(() => sendTestEmail(def.key, v), "Test sent.")} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-50">
            Send me a test email
          </button>
          {isCustom && (
            <button type="button" disabled={pending} onClick={() => run(() => resetTemplate(def.key), "Back to the default wording.", () => setV(def.defaults))} className="text-sm text-zinc-500 hover:text-zinc-800">
              Reset to default
            </button>
          )}
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}
