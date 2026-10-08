"use client";

import { useState, useTransition } from "react";
import { VoiceItemList, type ItemMatch, type ItemRow } from "@/components/voice-item-list";
import { createDraftFromVoice } from "@/app/(dashboard)/estimates/actions";

const inputClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export interface Intake {
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
  scheduledAt: string;
  scheduledEndAt: string;
}

/** What the server extracted from a recording or typed message. */
export interface IntakeResult {
  intake: Intake;
  match: { id: string; label: string } | null;
  items: ItemMatch[];
  unmatched: string[];
}

/** Editable review of an extracted estimate request; accepting saves the customer and a draft estimate. */
export function IntakeReview({
  result,
  defaultState,
  onDiscard,
  discardLabel,
  heardLabel = "What I heard",
}: {
  result: IntakeResult;
  defaultState: string | null;
  onDiscard: () => void;
  discardLabel: string;
  heardLabel?: string;
}) {
  const [intake, setIntake] = useState<Intake>({ ...result.intake, state: defaultState || result.intake.state });
  const [useMatch, setUseMatch] = useState(true);
  const [rows, setRows] = useState<ItemRow[]>(result.items.map((m) => ({ ...m, checked: true })));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { match, unmatched } = result;

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await createDraftFromVoice({
        existingCustomerId: match && useMatch ? match.id : undefined,
        customer: intake,
        jobNotes: intake.jobNotes,
        scheduledAt: intake.scheduledAt,
        scheduledEndAt: intake.scheduledEndAt,
        items: rows.filter((r) => r.checked).map((r) => ({ priceBookItemId: r.priceBookItemId, quantity: r.quantity })),
      });
      if (res?.error) setError(res.error);
    });
  }

  const set = (k: keyof Intake) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setIntake((prev) => ({ ...prev, [k]: e.target.value }));

  return (
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
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Job details</p>
      <textarea rows={3} className={inputClass} placeholder="Job details" value={intake.jobNotes} onChange={set("jobNotes")} />
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Schedule</p>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Start</span>
          <input type="datetime-local" className={inputClass} value={intake.scheduledAt} onChange={set("scheduledAt")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">End (multi-day jobs)</span>
          <input
            type="datetime-local"
            className={inputClass}
            value={intake.scheduledEndAt}
            min={intake.scheduledAt || undefined}
            disabled={!intake.scheduledAt}
            onChange={set("scheduledEndAt")}
          />
        </label>
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Items from your price book</p>
      <VoiceItemList rows={rows} unmatched={unmatched} onChange={setRows} />
      <details className="text-xs text-zinc-400">
        <summary className="cursor-pointer">{heardLabel}</summary>
        <p className="mt-1 whitespace-pre-wrap">{intake.transcript}</p>
      </details>
      {error && <p className="text-sm text-red-600">{error}</p>}
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
          onClick={onDiscard}
          disabled={isPending}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
        >
          {discardLabel}
        </button>
      </div>
    </div>
  );
}
