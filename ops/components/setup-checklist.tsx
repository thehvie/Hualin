"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface SetupStep {
  key: string;
  title: string;
  hint: string;
  href: string;
  cta: string;
  done: boolean;
  /** An optional second way to finish the step, like importing a spreadsheet. */
  altHref?: string;
  altLabel?: string;
}

const STORAGE_KEY = "ops-setup-checklist-hidden";

/** First-run guide on the dashboard home. Goes away on its own when every step is done, or when hidden. */
export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* storage blocked: just show it */
    }
  }, []);

  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Get set up</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {done} of {steps.length} done. A few minutes now saves time on every job.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setHidden(true);
            try {
              window.localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
          }}
          className="text-xs text-zinc-400 hover:text-zinc-700"
        >
          Hide
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-brand" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-emerald-100 text-emerald-700" : "border border-zinc-300 text-transparent"}`}
            >
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${s.done ? "text-zinc-400 line-through" : "text-zinc-900"}`}>{s.title}</p>
              {!s.done && <p className="text-xs text-zinc-500">{s.hint}</p>}
            </div>
            {!s.done && (
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                <Link href={s.href} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                  {s.cta}
                </Link>
                {s.altHref && (
                  <Link href={s.altHref} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                    {s.altLabel}
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
