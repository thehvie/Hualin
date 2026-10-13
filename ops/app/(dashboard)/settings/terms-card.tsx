"use client";

import { useState, useTransition } from "react";
import { saveTerms } from "./actions";
import { DEFAULT_TERMS } from "@/lib/terms-default";
import { TermsView } from "@/components/terms-view";

const area =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

/** Edit the terms & conditions printed on estimates and invoices (PDFs and the pages customers sign and pay from). */
export function TermsCard({ termsText, rentalTermsText }: { termsText: string; rentalTermsText: string }) {
  const [terms, setTerms] = useState(termsText);
  const [rental, setRental] = useState(rentalTermsText);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const dirty = terms.trim() !== termsText.trim() || rental.trim() !== rentalTermsText.trim();

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await saveTerms({ termsText: terms, rentalTermsText: rental });
      setMessage(res.ok ? { ok: true, text: "Saved. New and unsigned documents use the updated terms right away." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Terms &amp; conditions</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Printed at the bottom of every estimate and invoice, on the PDF and on the page your customer opens. Edit it any time.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Terms for all estimates and invoices</span>
        <textarea rows={10} className={area} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={DEFAULT_TERMS} />
        <span className="flex justify-between text-xs text-zinc-400">
          <span>Leave blank to use the default wording shown in grey.</span>
          <button type="button" onClick={() => setTerms(DEFAULT_TERMS)} className="font-medium text-brand hover:underline">
            Start from the default
          </button>
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700">Extra terms when there is a rental</span>
        <textarea
          rows={8}
          className={area}
          value={rental}
          onChange={(e) => setRental(e.target.value)}
          placeholder="Rental period, weight limits and overage charges, prohibited items, customer responsibility for damage and permits, placement and access…"
        />
        <span className="text-xs text-zinc-400">Added after the terms above, under &ldquo;Rental terms&rdquo;, only on documents that include a dumpster or equipment rental.</span>
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500">
          Formatting: <code>### Heading</code>, <code>**bold**</code>, numbered lines like <code>1. Weight limit</code>, and bullets that start with <code>-</code> or{" "}
          <code>*</code>. Anything you paste from a document works.
        </p>
        <button type="button" onClick={() => setPreview((v) => !v)} className="w-fit text-xs font-medium text-brand hover:underline">
          {preview ? "Hide preview" : "Preview how it looks"}
        </button>
        {preview && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600">
            <TermsView text={terms.trim() || DEFAULT_TERMS} />
            {rental.trim() && (
              <>
                <p className="mt-3 text-sm font-semibold text-zinc-700">Rental terms</p>
                <TermsView text={rental} />
              </>
            )}
          </div>
        )}
      </div>

      <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
        When a customer signs an estimate, the terms they agreed to are saved with it. Changing them here later doesn&apos;t alter an estimate that has already
        been signed.
      </p>

      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || !dirty} onClick={save} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save terms"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </div>
  );
}
