"use client";

import Link from "next/link";
import { useActionState } from "react";

import { importCustomers, type ImportResult } from "./actions";

export function ImportForm() {
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(importCustomers, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5">
        <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
        <div>
          <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Importing…" : "Import customers"}
          </button>
        </div>
      </form>

      {result && !result.ok && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>}
      {result?.ok && (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            Added {result.added} customer{result.added === 1 ? "" : "s"}.
            {result.skipped && result.skipped.length > 0 ? ` Skipped ${result.skipped.length}.` : ""}
          </p>
          {result.skipped && result.skipped.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs">
              {result.skipped.map((s) => (
                <li key={s.line}>
                  Line {s.line}: {s.reason}
                </li>
              ))}
            </ul>
          )}
          <Link href="/customers" className="mt-3 inline-block font-semibold underline">
            See your customers
          </Link>
        </div>
      )}
    </div>
  );
}
